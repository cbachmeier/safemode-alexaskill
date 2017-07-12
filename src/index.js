var Alexa = require('alexa-sdk');
var nodemailer = require('nodemailer');
var speakeasy = require('speakeasy');
var request = require('request');

var states = {
    SAFEMODE: '_SAFEMODE',                // Where Alexa will only respond to 'Alexa leave safe mode'
    LEAVEMODE: '_LEAVEMODE'               // User must enter the correct 6 digit passcode
};
var transporter = nodemailer.createTransport({
    service: 'yahoo',
    auth: {
        user: 'donotreply.safemode@yahoo.com',
        pass: 'practicesafealexa'
    }
});

//this is the message when Alexa is entering safe mode
var enterSafeMode = "Going into safe mode. Your one time passcode is ";

//this is the message to repeat your passcode
var repeatPassCode= "Your passcode is "

//this is the message when the user wishes to leave safe mode
var enterPassCode = "Please say your six digit passcode ";//sent to your Amazon email address.";

//this is the message when the user gives the correct six digit passcode while trying to leave safe mode
var leaveSafeMode = "Leaving safe mode.";

//this is the message when the user asks for their passcode to be resent
var resendMessage = "I have sent the same passcode to your Amazon email address."

//this is the message when the user gives something other than the correct six digit passcode while trying to leave safe mode
var incorrectPassCode= "I'm sorry that's not correct. If you would like to try again please say, Alexa leave safe mode.";

//when the user says anything other than "Alexa leave safe mode" while Alexa is in safe mode
var safeModeMessage = "Sorry I can not do that, I am currently in safe mode. If you wish to leave safe mode say, Alexa leave safe mode.";

//when emails can not be sent
var emailError= 'I cannot send emails right now, please try again later.'

//general help message
var helpMessage = "If you would like me to enter safe mode please say, Alexa enter safe mode.";

var token;
//var userEmail='';
// --------------- Handlers -----------------------

// Called when the session starts.
exports.handler = function (event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.registerHandlers(newSessionHandler, safeModeHandlers, leaveModeHandlers);
    alexa.execute();
};

// set state to start up and  welcome the user
var newSessionHandler = {
  'LaunchRequest': function () {
    // //if no amazon token, return a LinkAccount card
    // if (this.event.session.user.accessToken == undefined) {
    //     this.emit(':tellWithLinkAccountCard','To start using this skill, please use' +
    //         ' the companion app to authenticate on Amazon.');
    //     return;
    // };
    // //get users email
    // var amznProfileURL = 'https://api.amazon.com/user/profile?access_token=';
    // amznProfileURL += this.event.session.user.accessToken;
    //
    // request(amznProfileURL, function(error, response, body) {
    //     if (response.statusCode == 200) {
    //         var profile = JSON.parse(body);
    //         userEmail=profile.email;
    //     } else {
    //         this.emit(':tell', "I can't connect to Amazon Profile Service right now, please try again later.");
    //         return;
    //     }
    // });
    //generate TOTP passcode
    //TODO generate and send a qrcode so that this can work with Google Authenticator
    var secret = speakeasy.generateSecret({length:20});
    token = speakeasy.totp({
        secret: secret.base32,
        encoding: 'base32',
        time: 1453667708 // specified in seconds
    });
    //send passcode via email
    // var email = getMail(token,userEmail);
    // transporter.sendMail(email);
    this.handler.state = states.SAFEMODE;
    this.emit(':tell', enterSafeMode+token, repeatPassCode+token);
  },
  'Unhandled': function () {
    this.emit(':tell', helpMessage,helpMessage);
  }
};

// --------------- Functions that control the skill's behavior -----------------------

// Handler for safe mode, Alexa should only respond to 'Alexa leave safe mode.' or 'Alexa send my passcode again'
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
            this.emit(':tell',leaveSafeMode);
            this.handler.state = '';
            return;
        }
        else {
            this.emit(':tell',incorrectPassCode,incorrectPassCode);
            this.handler.state = states.SAFEMODE;
        }
    },
    // 'ResendIntent': function () {
    //
    //     var emailSent = sendMail(token,userEmail)
    //     if (emailSent){
    //         this.emit(':tell', resendMessage, resendMessage);
    //     }
    //     else{
    //         this.emit(':tell',emailError,emailError);
    //     }
    // },
    'Unhandled': function () {
        this.emit(':tell', safeModeMessage, safeModeMessage);
    }
});


// user will need to enter the correct six digit passcode or be sent back to safe mode
var leaveModeHandlers = Alexa.CreateStateHandler(states.LEAVEMODE, {

    'PasscodeIntent': function () {
        //user submitted passcode
        var userPassCode = parseInt(this.event.request.intent.slots.passcode.value);
        if (token==userPassCode){
            this.emit(':tell',leaveSafeMode);
            this.handler.state = '';
            return;
        }
        else {
            this.emit(':tell',incorrectPassCode,incorrectPassCode);
            this.handler.state = states.SAFEMODE;
        }
    },
    'Unhandled': function () {
        this.emit(':tell', incorrectPassCode, incorrectPassCode);
    }
});

function getMail(token,userEmail){
    var mailOptions = {
        from: 'donotreply.safemode@yahoo.com',
        to: userEmail,
        subject: 'Alexa SafeMode Passcode',
        text: 'Here is your one time passcode: '+ token
    };
    return mailOptions;
}

