var Alexa = require('alexa-sdk');
var nodemailer = require('nodemailer');
var speakeasy = require('speakeasy');
var request = require('request');

var states = {
    SETUPMODE: '_SETUPMODE',              // where Alexa sets up the passcode
    SAFEMODE: '_SAFEMODE',                // Alexa will be unresponsive except for unlocking or resend requests
    LEAVEMODE: '_LEAVEMODE'               // User must enter the correct 6 digit passcode
};

//to make sure the user really wishes to go into safe mode
var confirmationMessage = "Are you sure you would like to enter safe mode?";

//this is the message when Alexa is entering safe mode
var enterSafeMode = "Going into safe mode. You should find your one time passcode in your Alexa app.";

//when the user does not wish to enter safe mode
var goodbyeMessage = "Okay, I will not enter safe mode."

//this is the message to repeat your passcode
var repeatPassCode= "Okay, I resent your passcode to the Alexa app."

//this is the message when the user wishes to leave safe mode
var enterPassCode = "Please say your six digit passcode ";//sent to your Amazon email address.";

//this is the message when the user gives the correct six digit passcode while trying to leave safe mode
var leaveSafeMode = "Leaving safe mode.";

//this is the message when the user gives something other than the correct six digit passcode while trying to leave safe mode
var incorrectPassCode= "I'm sorry that's not the correct passcode. If you would like to try again please say, Alexa leave safe mode.";

//when the user says anything other than "Alexa leave safe mode" while Alexa is in safe mode
var safeModeMessage = "Sorry I can not do that, I am currently in safe mode. If you wish to leave safe mode say, Alexa leave safe mode.";

//general help message
var helpMessage = "If you would like me to enter safe mode please say, Alexa enter safe mode.";

var token;
//var userEmail='';
// --------------- Handlers -----------------------

// Called when the session starts.
exports.handler = function (event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.registerHandlers(newSessionHandler, setupModeHandlers, safeModeHandlers, leaveModeHandlers);
    alexa.execute();
};

// set state to setup and confirm they wish to go into safe mode
var newSessionHandler = {
  'LaunchRequest': function () {
    this.handler.state = states.SETUPMODE;
    this.emit(':ask', confirmationMessage);
  },
  'Unhandled': function () {
    this.emit(':tell', helpMessage,helpMessage);
  }
};

// --------------- Functions that control the skill's behavior -----------------------

var setupModeHandlers = Alexa.CreateStateHandler(states.SETUPMODE, {
    //user said yes, so create passcode and enter safe mode
    'AMAZON.YesIntent': function () {
        //generate TOTP passcode
        //TODO generate and send a qrcode so that this can work with Google Authenticator
        var secret = speakeasy.generateSecret({length:20});
        token = speakeasy.totp({
            secret: secret.base32,
            encoding: 'base32',
            time: 1453667708 // specified in seconds
        });

        this.handler.state = states.SAFEMODE;
        this.emit(':tellWithCard', enterSafeMode, 'Safe Mode Passcode',"Your one time passcode is "+token);
    },
    'AMAZON.NoIntent': function(){
        this.emit(':tell',goodbyeMessage);
    },
    'Unhandled': function () {
        this.emit(':tell',"Say yes to enter safe mode or no to leave.");
    }
});

// Handler while in safe mode, Alexa should only respond to 'Alexa leave safe mode.',
// 'Alexa send my passcode again', or the passcode itself
var safeModeHandlers = Alexa.CreateStateHandler(states.SAFEMODE, {
    'LeaveIntent': function () {

        // set state to attempt to leave
        this.handler.state = states.LEAVEMODE;

        // prompt user to enter six digit passcode
        this.emit(':ask', enterPassCode, enterPassCode);
    },
    'PasscodeIntent': function () {
        //user submitted passcode
        var userPassCode = parseInt(this.event.request.intent.slots.passcode.value);
        if (token==userPassCode){
            this.handler.state = states.SETUPMODE;
            this.emit(':tell',leaveSafeMode);

        }
        else {
            this.emit(':tell',incorrectPassCode,incorrectPassCode);
        }
    },
    'ResendIntent': function () {
        this.emit(':tellWithCard', repeatPassCode, 'Safe Mode Passcode',"Your one time passcode is "+token);

    },
    'Unhandled': function () {
        this.emit(':tell', safeModeMessage, safeModeMessage);
    }
});


// user will need to enter the correct six digit passcode or be sent back to safe mode
var leaveModeHandlers = Alexa.CreateStateHandler(states.LEAVEMODE, {

    'PasscodeIntent': function () {
        //user submitted passcode
        var userPassCode = parseInt(this.event.request.intent.slots.passcode.value);
        if (token==userPassCode) {
            this.handler.state = states.SETUPMODE;
            this.emit(':tell', leaveSafeMode);
        }
        else {
            this.handler.state = states.SAFEMODE;
            this.emit(':tell',incorrectPassCode,incorrectPassCode);
        }
    },
    'Unhandled': function () {
        this.handler.state = states.SAFEMODE;
        this.emit(':tell', incorrectPassCode, incorrectPassCode);
    }
});
