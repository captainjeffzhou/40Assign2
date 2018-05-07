//We create 3 variables to include all required libraries for our project. 
//This is the NodeJS equivilant of Swift’s import statement
var raspi = require("raspi-io")
var five = require("johnny-five")
var i2c = require("i2c");
//
var express = require('express')
var app = express();

var count = 0;
var resultt = [];
/////var dict = {};
//-----------------------------------------------------------------------------
// TCS34725 Sensor 
//We create 3 variables for our RGB Sensor
//The first variable is our address. This is the address on the I2C bus. 
//You will notice this correlates to 
//one of the two addresses in a previous step (This means 0x60 is our temp sensor)
var address = 0x29; 
var version = 0x44;
//Our next variable will hold our reference to the physical sensor. 
//We specify the I2C address and the I2C bus to use (For the Raspberry Pi 3 this is i2c-2)
var rgbSensor = new i2c(address, {device: '/dev/i2c-1'});
//-----------------------------------------------------------------------------
// Variables to store colour values
//We create red, green & blue variables to be used later. As there will be bit shifting involved, 
//storing them into a variable makes the code neater than direct console output.
var red;
var green;
var blue;

var cels;
var press;
var meter;
//Our board variable will hold a reference to the Johnny five object for the temp sensor
var board = new five.Board({ 
    io: new raspi()
});

//-----------------------------------------------------------------------------
//The board.on function is used to check for events (It uses an event handler) 
//and will call a function when that even is received.
//In this instance, we are looking for Johnny-Five to 
//initialize which will cause a “ready”event
board.on("ready", function() {
    //When the “ready” event is triggered, we create a variable to hold our temp sensor and initialize it
    var multi = new five.Multi({

        controller: "MPL3115A2",
        elevation: 23

    });

    // temperature sensor
    console.log("server ready to begin processing...");
    //The temp sensor variable is set to listen for the event “change” which will be called every time
    //there is a change in either temp, barometer or altimeter.
    multi.on("change", function(){
        //console.log("Thermometer:celsius: ", this.thermometer.celsius);
        cels = this.thermometer.celsius;
        //console.log("Barometer:pressure: ", this.barometer.pressure);
        press = this.barometer.pressure;
        //console.log("Altimeter: ", this.altimeter.meters);
        meter = this.altimeter.meters;
    });

    // Run setup if we can retreive correct sensor version for TCS34725 sensor
    // Lastly, we attempt to connect to the RGB sensor. If this is successful we begin initialization.
    rgbSensor.writeByte(0x80|0x12, function(err){});
    rgbSensor.readByte(function(err, res) {
        if(res == version) {
            setup();
            captureColours();
        }
    });
});

//-----------------------------------------------------------------------------
//To initialize the RGB sensor we need to write a couple bytes into different registries. 
//Inside of the setup function we first enable the registries, turn on the sensor 
//then initialize Register 14 (Thelocation of the sensor data).
function setup() {
    // Enable register
    rgbSensor.writeByte(0x80|0x00, function(err){});
    // Power on and enable RGB sensor
    rgbSensor.writeByte(0x01|0x02, function(err){});
    // Read results from Register 14 where data values are stored
    rgbSensor.writeByte(0x80|0x14, function(err){});
    }

//-----------------------------------------------------------------------------
//Our capture colours function is quite tricky. We will not go too much into this 
//but this is a general overview
//- We attempt to read our registry
//- When we receive a result, it will be an array stored in the variable res
function captureColours() {
    // Read the information, output RGB as 16bit number
    rgbSensor.read(8, function(err, res) {
    // Colours are stored in two 8bit address registers, we need to combine them
        red = res[3] << 8 | res[2];
        green = res[5] << 8 | res[4];
        blue = res[7] << 8 | res[6];
        // Print rgbSensor data to console
        //console.log("Red: " + red);
        //console.log("Green: " + green);
        //console.log("Blue: " + blue);
        var dict = {};
        dict['Red'] = red;
        dict['Green'] = green;
        dict['Blue'] = blue;
        dict['temp'] = cels;
        dict['pressure'] = press;
        dict['altimeter'] = meter;
        //var count = resultt.length;
        count = count + 1;
        dict['count'] = count;
        resultt.push(dict);
        var afterCount = resultt.length;
        //only preserve latest 30mins data
        if(afterCount > 360){
            // remove the first iteam in the array
            resultt.shift();
        }
        //app.get('/', function(request, result){
          //  result.contentType('application/json');
         //   result.send(JSON.stringify(resultt));
        
        //});
        //app.listen(8081);

    });
}

//-----------------------------------------------------------------------------
//Finally, we set up a re-occurring function that will 
//call captureColours at a half second interval.
setInterval(function(){

    captureColours();

},5000);
//-----------------------------------------------------------------------------
app.get('/', function(request, result){
    result.contentType('application/json');
    result.send(JSON.stringify(resultt));

});
app.listen(8080);