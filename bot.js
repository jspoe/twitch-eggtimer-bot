require('dotenv').config()

const tmi = require('tmi.js')
var timers = []
var Timer = require('clockmaker').Timer

// Define configuration options
const opts = {
    options: { debug: true, messagesLogLevel: "info" },
    connection: {
        reconnect: true,
        secure: true
    },
    identity: {
        username: 'EggTimerBot',
        password: process.env.API_KEY
    },
    channels: [
        process.env.CHANNEL
    ],
    timers: timers
}

const client = new tmi.client(opts)
client.on('message', onMessageHandler)
client.on('connected', onConnectedHandler)
client.connect()

/**
 *
 * @param target
 * @param context
 * @param msg
 * @param self
 */
function onMessageHandler (target, context, msg, self) {
    if (self) { return }
    const command = msg.trim()

    if (isValidCommand(client, command, context)) {
        const regexStart = /(!eggtimer start) ([a-zA-z0-9]+) ([0-9].*)/gm
        const regexStop = /(!eggtimer stop) ([a-zA-z0-9]+)/gm
        const regexTimeleft = /(!eggtimer time) ([a-zA-z0-9]+)/gm

        const matchedStart = [... command.matchAll(regexStart)]
        const matchedStop = [... command.matchAll(regexStop)]
        const matchedTimeLeft = [... command.matchAll(regexTimeleft)]

        if (matchedStart.length) {
            var name = matchedStart[0][2]
            var seconds = convertToSeconds(matchedStart[0][3])

            if (this.opts.timers[name] === undefined) {
                if (seconds) {
                    setTimer(this, client, target, name, (seconds * 1000))
                } else {
                    client.say(target, `Usage !eggtimer start <name> 1h 1m 1s`)
                }
            } else {
                client.say(target, `Timer with name ${name} already exists.`)
            }
        }

        if (matchedStop.length) {
            var name = matchedStop[0][2]
            stopTimer(this, client, target, name)
        }

        if (matchedTimeLeft.length) {
            var name = matchedTimeLeft[0][2]
            timerLeft(this, client, target, name)
        }
    }
}

/**
 *
 * @param milliseconds
 */
function setTimer (self, client, target, name, milliseconds) {
    var ctx = {
        client: client,
        target: target,
        name: name,
        opts: self.opts,
        startDate: Date.now()
    }
    var timer = new Timer(function (timer) {
        this.client.say(this.target, `Timer ${this.name} rings`)
        this.client.say(this.target, `!redeem ping`)
        this.opts.timers[this.name] = null
    }, milliseconds, {
        thisObj: ctx
    })
    timer.start()
    self.opts.timers[name] = timer

    client.say(target, `Timer ${name} started`)
}

/**
 *
 * @param client
 * @param num
 */
function stopTimer(self, client, target, name)
{
    if (self.opts.timers[name]) {
        var timer = self.timers[name]
        timer.stop()

        client.say(target, `Timer ${name} has been stopped.`)
    } else {
        client.say(target, `Usage !eggtimer stop <name>`)
    }
}

/**
 *
 * @param client
 * @param num
 */
function timerLeft(self, client, target, name) {
    if (self.opts.timers[name]) {
        var timer = self.opts.timers[name]
        var timeLeft = getTimeLeft(timer._fnThis.startDate, timer._timerHandle)
        client.say(target, `Timer ${name} has ${timeLeft} left.`)
    } else {
        client.say(target, `Usage !eggtimer time <name>`)
    }
}

/**
 *
 * @param startDate
 * @param timeout
 * @returns {number}
 */
function getTimeLeft(startDate, timeout) {
    var now = Date.now()
    var end = startDate + timeout._idleTimeout
    var exceeded = end - now

    return sanitizeTime(exceeded)
}

/**
 *
 * @param timestamp
 * @returns {string}
 */
function sanitizeTime(timestamp) {

    function pad(n, z) {
        z = z || 2
        return ('00' + n).slice(-z)
    }

    var millies = timestamp % 1000
    timestamp = (timestamp - millies) / 1000
    var secs = timestamp % 60
    timestamp = (timestamp - secs) / 60
    var mins = timestamp % 60
    var hrs = (timestamp - mins) / 60

    return pad(hrs) + ':' + pad(mins) + ':' + pad(secs)
}

/**
 *
 * @param time
 * @returns {number}
 */
function convertToSeconds(time)
{
    const regex = /(2[0-4]|1[0-9]|[1-9])(?=h)|([1-5][0-9]|[1-9])(?=m)|([1-5][0-9]|[1-9])(?=s)/gm
    const matches = time.matchAll(regex)
    let timeInSeconds = 0
    for (const match of matches) {
        if (match[1] != undefined) {
            timeInSeconds += (match[1] * 60 * 60)
        }

        if (match[2] != undefined) {
            timeInSeconds += (match[2] * 60)
        }

        if (match[3] != undefined) {
            timeInSeconds += (match[3] * 1)
        }
    }

    return timeInSeconds
}

/**
 *
 * @param client
 * @param command
 * @param user
 * @returns {boolean}
 */
function isValidCommand(client, command, user)
{
    if (command.startsWith('!eggtimer')) {
        let isMod = user.mod || user['user-type'] === 'mod'
        let isBroadcaster = user.badges.broadcaster === "1"
        let isModUp = isMod || isBroadcaster

        if (isModUp) {
            return true
        }
    }
    return false
}

/**
 *
 * @param addr
 * @param port
 */
function onConnectedHandler (addr, port) {
    console.log(`* Connected to ${addr}:${port}`)
}