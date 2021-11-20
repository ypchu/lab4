let currentDevice;
let isPause = false;
let isFilt = false;
const serviceUUID = '0000ff01-0000-1000-8000-00805f9b34fb';
const charUUID = '0000aa01-0000-1000-8000-00805f9b34fb';
let package = [];
let datas = [];
let currentTime = 0;
let times = [];

const timer = {
    timerFlag: 0,
    startTimer: function() {
        this.timerFlag = setInterval(() => {
            ECG.x = times;
            ECG.y = datas;

            const ctime = (currentTime-times.length) / fs;
            layout.xaxis.range = [ctime, ctime + totalTime];

            Plotly.redraw('chart');
        }, 200);
    },
    stopTimer: function() {
        clearInterval(this.timerFlag);
        this.timerFlag = 0;
    }
};

const ECG = {
    x: times,
    y: datas,
    mode: 'lines',
    name: 'ECG',
    marker: {
        color: 'blue',
        size: 12
    }
};
const fs = 500;
const totalTime = 5;
const layout = {
    title: 'Real-time ECG signal',
    xaxis: { range: [0, totalTime] },
    yaxis: { range: [0, 5] }
};
Plotly.newPlot('chart', [ECG], layout);





const points = fs * totalTime;

$('.btn').click(ble);

let avg_coef_len = Math.floor(fs / 60);
const coef = Array(avg_coef_len).fill(1 / avg_coef_len);
const queue = Array(avg_coef_len).fill(0);

function movingAvg(dot, coef, flag) {
    queue.shift();
    queue.push(dot);

    let tmp = 0;
    queue.forEach((_, idx) => tmp += coef[idx] * queue[idx]);
    return (flag) ? tmp : dot;
}

function ble(evt) {
    console.log(evt.target.innerHTML, 'Click');
}

function ble(evt) {
    console.log(evt.target.innerHTML, 'Click');

    switch (evt.target.innerHTML) {
        case 'Scan':
            scan();
            break;
        case 'Connect':
            connect(currentDevice);
            break;
        case 'Disconnect':
            disconnect(currentDevice);
            break;
        case 'Pause/Run':
            isPause = toggle(isPause);
            break;
        case 'Filter_ON/OFF':
            isFilt = toggle(isFilt);
            break;
        default:
            console.log('No such case...')
    }
}

function toggle(isPause) {
    return !isPause;
}

function scan() {
    navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [serviceUUID]
    }).then(device => {
        currentDevice = device;
        console.log('choosen:', currentDevice);
    }).catch(err => console.log('Error:', err));
}

function connect(dev) {
    timer.startTimer();

    dev.gatt.connect().then(server => {
        console.log(server);
        return server.getPrimaryService(serviceUUID);
    }).then(service => {
        console.log(service);
        return service.getCharacteristic(charUUID);
    }).then(char => {
        console.log(char);
        char.startNotifications().then(c => {
            c.addEventListener('characteristicvaluechanged', function(evt) {
                if (!isPause) {
                    package = Array.from(new Uint16Array(this.value.buffer));
                    // $('#package-header')[0].innerHTML = 'Number of Package:' + package.length;
                    // $('#package-body')[0].innerHTML = '[' + package + ']';
                    package.forEach(dot => {
                        currentTime++;
                        if (datas.length < points) {
                            datas.push(movingAvg(dot * 3.6 / 4096, coef, isFilt));
                            times.push((currentTime / fs));
                        } else {
                            datas = [movingAvg(dot * 3.6 / 4096, coef, isFilt)];
                            times = [(currentTime / fs)];
                        }
                    });
                }
            });
        });
    }).catch(err => console.log('Error:', err));
}

function disconnect(dev) {
    dev.gatt.disconnect();
    console.log(dev.name, 'Online');
    package = [];
    datas = [];
    currentTime = 0;
    times = [];
    timer.stopTimer();
}