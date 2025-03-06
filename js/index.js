/******************************

PRE-LOAD THESE PUPPIES 

*******************************/
_addToManifest(manifest,{
	firefly: "sprites/firefly.json"
});

/******************************

CONSTANTS-ISH
(they're not really constants, w/e)

*******************************/

var NUM_FIREFLIES,
	FLY_LOOP,
	FLY_SWERVE,
	SHOW_CLOCKS,
	FLY_CLOCK_SPEED,
	FLY_RADIUS,
	FLY_PULL,
	FLY_SYNC,
	MOUSE_RADIUS,
    FIXED,
    RANDOM_OMEGA,
    OBSERVE_ALL,
    COLOR,
    RECORD,
    AVG_X,
    AVG_Y,
    AVG_THETA,
    CANVAS_CIRCLES_SIZE = 350,
    MID_CNV_SZ = CANVAS_CIRCLES_SIZE/2;

const OMEGA_0 = 1;

var _resetConstants = function () {
	var area = window.innerWidth * window.innerHeight;
	NUM_FIREFLIES = Math.round(area * (150)/(1280*600)); // 150 fireflies per 1280x600
	if(NUM_FIREFLIES<100) NUM_FIREFLIES=100; // actually, MINUMUM 100
	
	FLY_LOOP = 50;
	FLY_SWERVE = 0.1;
	SHOW_CLOCKS = false;
	FLY_CLOCK_SPEED = 2;
	FLY_RADIUS = 200;
	FLY_PULL = 0.3;
	FLY_SYNC = false;
	MOUSE_RADIUS = 200;
    FIXED = false;
    RANDOM_OMEGA = false;
    OBSERVE_ALL = false;
    COLOR = true;
    RECORD = false;
    AVG_X = 0;
    AVG_Y = 0;
    AVG_THETA = 0;
};

_resetConstants();

/******************************

THE MAIN GAME CODE

*******************************/

var app;
var canvasCircles;
var fireflies = [];
let circles = []
let avg_circle;
let radius_avg_circle;
let axes;
let simulation = {
    ticks: 0,
    data: []
};
window.onload = async function(){

    canvasCircles = new PIXI.Application(CANVAS_CIRCLES_SIZE, CANVAS_CIRCLES_SIZE, {backgroundColor:0xFFFFFF});
    $("#graph").appendChild(canvasCircles.view);
    radius_avg_circle = new PIXI.Graphics();
    axes = new PIXI.Graphics();
    canvasCircles.stage.addChild(axes);
    canvasCircles.stage.addChild(radius_avg_circle);

	// Create app!
	app = new PIXI.Application(document.body.clientWidth, document.body.clientHeight, {backgroundColor:0x000000});
	$("#game").appendChild(app.view);

	// Mouse
	Mouse.init($("#game"));

	// When loaded all assets...
	_loadAssets(manifest, function(){

		// Add fireflies!
		_addFireflies(NUM_FIREFLIES);
        drawAxes()
        addAvgCircle();
		// Animation loop
		app.ticker.add(function(delta){
           updateFlies(delta);
		});

        canvasCircles.ticker.add(function(delta){
            updateCircles();
        })

		// Synchronize 'em!
		_syncConstants();

	});

	// Set up widgets!
	Widgets.convert($("#words"));

};

function polarToCartesian(r, theta) {
    return {
        x: r * Math.cos(theta),
        y: - r * Math.sin(theta)
    };
}

const rgb2Hex = (str) => str.match(/[0-9]+/g).reduce((a, b) => a + (b | 256).toString(16).slice(1), '0x');

const linearColor = d3.scaleLinear().range([0, 0.9]).domain([0, 1]);

function colorWith(colorer, num) {
    return rgb2Hex(colorer(linearColor(num)));
}

function numberToColor(num) {
    if (COLOR) {
        return colorWith(d3.interpolateSpectral, num);
    }
    return colorWith(d3.interpolateGreys, num);
}

function addAvgCircle() {
    const circle = new PIXI.Graphics();
    circle.beginFill('0x000000');
    circle.drawCircle(MID_CNV_SZ, MID_CNV_SZ, 10);
    circle.endFill();
    avg_circle = circle;
    canvasCircles.stage.addChild(circle);
}

function updateFlies(delta){
    AVG_X = 0;
    AVG_Y = 0;
    for(var i=0; i<fireflies.length; i++){
        fireflies[i].update(delta);
        AVG_X += Math.cos(fireflies[i].theta);
        AVG_Y += Math.sin(fireflies[i].theta);
    }
    AVG_X = AVG_X/fireflies.length;
    AVG_Y = AVG_Y/fireflies.length;
    AVG_THETA = Math.atan2(AVG_Y, AVG_X)
    AVG_THETA = AVG_THETA < 0 ? AVG_THETA + 2 * Math.PI : AVG_THETA
    if(RECORD){
        recordData();
    }
}

function recordData() {
    simulation.ticks += 1;
    document.getElementById("numTicks").innerText = simulation.ticks;
    for(var i=0; i<fireflies.length; i++){
        simulation.data[i].push(fireflies[i].theta);
    }
}

function updateCircles() {
    let coordinates = polarToCartesian(150*Math.sqrt(AVG_X ** 2 + AVG_Y ** 2), AVG_THETA);
    avg_circle.x = coordinates.x;
    avg_circle.y = coordinates.y;
    radius_avg_circle.clear();
    radius_avg_circle.lineStyle(3, 0xff0000, 1)
    radius_avg_circle.moveTo(MID_CNV_SZ, MID_CNV_SZ);
    radius_avg_circle.lineTo(MID_CNV_SZ + coordinates.x, MID_CNV_SZ + coordinates.y);

    for(var i=0; i< circles.length; i++){
        coordinates = polarToCartesian(150, fireflies[circles[i].id].theta);
        circles[i].circle.x = coordinates.x;
        circles[i].circle.y = coordinates.y;
    }
}

function removeCircles(j) {
    for (let i = 0; i < circles.length; i++) {
        if (circles[i].id == j) {
        canvasCircles.stage.removeChild(circles[i].circle);
            circles.splice(i, 1);
            return;
        }
    }
}

var _addFireflies = function(num){
    for(var i=0; i<num; i++){
        var ff = new Firefly();
		fireflies.push(ff);
		app.stage.addChild(ff.graphics);
        
        if (fireflies.length < 25 || Math.random() < 0.1) {
            const circle = new PIXI.Graphics();
            updateCircle(ff, circle);
            circles.push({ circle: circle, id: fireflies.length - 1 });
            canvasCircles.stage.addChild(circle);
        }
    }
};

function resetSimulation() {
    simulation = {
        ticks: 0,
        data: Array.from({ length: fireflies.length }, () => [])
    };
    document.getElementById("numTicks").innerText = simulation.ticks;
}

function updateCircle(firefly, circle) {
    circle.beginFill(numberToColor(firefly.omega));
    circle.lineStyle(1, 0x000000);
    circle.drawCircle(MID_CNV_SZ, MID_CNV_SZ, 10);
    circle.endFill();
    coordinates = polarToCartesian(150, firefly.theta);
    circle.x = coordinates.x;
    circle.y = coordinates.y;
}

var _removeFireflies = function (num) {
    for (var i = 0; i < num; i++) {
        removeCircles(fireflies.length - 1);
		var ff = fireflies.pop();
		app.stage.removeChild(ff.graphics);
	}
};

var _resetFireflies = function(){
	for(var i=0; i<fireflies.length; i++){
		var ff = fireflies[i];
		ff.theta = Math.random()*Math.TAU;
        ff.omega = Math.random();
	}	
};

function drawAxes() {
    const center = canvasCircles.screen.width / 2;
    axes.lineStyle(2, 0xCCCCCC, 1);
    axes.moveTo(0, center);
    axes.lineTo(canvasCircles.screen.width, center);
    axes.moveTo(center, 0);
    axes.lineTo(center, canvasCircles.screen.height);
}

/******************************

THE FIREFLY CODE

*******************************/

function Firefly(){

	var self = this;

	// Graphics
	self.graphics = new PIXI.Container();
	var g = self.graphics;
	g.scale.set(0.15);

	// Random spot
	self.x = Math.random()*app.renderer.width;
	self.y = Math.random()*app.renderer.height;
	self.angle = Math.random()*Math.TAU;
    self.omega = Math.random();
    self.theta = Math.random()*Math.TAU;
    self.dtheta = 0;
	self.speed = 0.5 + Math.random()*1;
	self.swerve = (Math.random()-0.5)*FLY_SWERVE;

	// Flash
	var flash = _makeMovieClip("firefly", {anchorX:0.5, anchorY:0.5});
	flash.gotoAndStop(2);
	flash.alpha = 0;
	g.addChild(flash);

	// Body
	var body = _makeMovieClip("firefly", {anchorX:0.5, anchorY:0.5});
	body.gotoAndStop(0);
	g.addChild(body);

	// Body2
	var body2 = _makeMovieClip("firefly", {anchorX:0.5, anchorY:0.5});
	body2.gotoAndStop(1);
	body2.alpha = 0;
	g.addChild(body2);

	// Wings
	var wings = _makeMovieClip("firefly", {anchorX:0.5, anchorY:0.5});
	wings.gotoAndStop((Math.random()<0.5) ? 3 : 4);
	g.addChild(wings);

	// Clock
	var clock = new PIXI.Container();
	clock.visible = false;
	g.addChild(clock);

	// Dark Clock
	var darkClock = new PIXI.Container();
	clock.addChild(darkClock);
	var darkClockBody = _makeMovieClip("firefly", {anchorX:0.5, anchorY:0.5});
	darkClockBody.gotoAndStop(7);
	darkClock.addChild(darkClockBody);
	var darkClockHand = _makeMovieClip("firefly", {anchorX:0.5, anchorY:0.5});
	darkClockHand.gotoAndStop(8);
	darkClock.addChild(darkClockHand);

	// Light Clock
	var lightClock = new PIXI.Container();
	lightClock.alpha = 0;
	clock.addChild(lightClock);
	var lightClockBody = _makeMovieClip("firefly", {anchorX:0.5, anchorY:0.5});
	lightClockBody.gotoAndStop(5);
	lightClock.addChild(lightClockBody);
	var lightClockHand = _makeMovieClip("firefly", {anchorX:0.5, anchorY:0.5});
	lightClockHand.gotoAndStop(6);
	lightClock.addChild(lightClockHand);

	// Mouse LAST pressed... a little decay...
	var _chaos = 0;

    self.getOmega = function () {
        return RANDOM_OMEGA ? self.omega : OMEGA_0;
    }

	// Update
	self.update = function(delta){

		//////////////////////
		// Position & Angle //
		//////////////////////

		// Update position
        if(!FIXED){
            self.x += self.speed * delta * Math.cos(self.angle);
            self.y += self.speed * delta * Math.sin(self.angle);
            // Loop around
            if(self.x<-FLY_LOOP) self.x=app.renderer.width+FLY_LOOP;
            if(self.x>app.renderer.width+FLY_LOOP) self.x=-FLY_LOOP;
            if(self.y<-FLY_LOOP) self.y=app.renderer.height+FLY_LOOP;
            if(self.y>app.renderer.height+FLY_LOOP) self.y=-FLY_LOOP;
    
            // Swerve
            self.angle += self.swerve;
            if(Math.random()<0.05) self.swerve = (Math.random()-0.5)*FLY_SWERVE;
        }

		////////////////////////
		// Cycling & Flashing //
		////////////////////////

		// Increment cycle
		flash.alpha *= 0.9;

		// If near mouse, get chaotic, and fast!
		if(Mouse.pressed) _chaos=1;
		if(_chaos>0.01 && closeEnough(self,Mouse,MOUSE_RADIUS)){
			self.theta += Math.random()*Math.PI;
		}
		_chaos *= 0.8;

        self.dtheta = FLY_CLOCK_SPEED*self.getOmega()/60;
        if(FLY_SYNC){
            let mcos = 0, msin=0, n=0;
            for(var i=0;i<fireflies.length;i++){
                var ff = fireflies[i];
                if(ff==self) continue; // is self? forget it
                if(OBSERVE_ALL || closeEnough(self,ff,FLY_RADIUS)){ // is close enough?
                    mcos += Math.cos(ff.theta)
                    msin += Math.sin(ff.theta)
                    n++;
                }
            }
            if (n>0){
                mcos = mcos/n
                msin = msin/n
                self.dtheta = FLY_CLOCK_SPEED*(self.getOmega() + FLY_PULL*(Math.cos(self.theta)*msin - Math.sin(self.theta)*mcos))/60;
            }
        }
        self.theta += self.dtheta;

        if(self.theta > Math.TAU){
			// Flash!
			flash.alpha = 1;
            self.theta = self.theta - Math.TAU
		}

		body2.alpha = flash.alpha;
		lightClock.alpha = flash.alpha;

		//////////////
		// Graphics //
		//////////////

		// Position
		g.x = self.x;
		g.y = self.y;
		g.rotation = self.angle+Math.TAU/4;

		// Flap wings
		wings.gotoAndStop( (wings.currentFrame==3) ? 4 : 3 );

		// Clocks!
		clock.rotation = -g.rotation;
		clock.visible = SHOW_CLOCKS;
		darkClockHand.rotation = lightClockHand.rotation = -(self.theta - Math.PI/2);

	};
	self.update(0);

}

function dumpSimulation(){
    const jsonStr = JSON.stringify(simulation, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "simulation.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/******************************

UI CODE: Resize, make widgets, etc...

*******************************/

subscribe("mousedown",function(){
	$("#words").className = "no-select";
});
subscribe("mouseup",function(){
	$("#words").className = "";
});

window.onresize = function(){
	if(app) app.renderer.resize(document.body.clientWidth, document.body.clientHeight);
};

/******************************

WIDGET CODE: Modifying "Constants"

*******************************/

// Synchronize with the UI
var _syncConstants = function(){
    publish("toggle/toggleMotion", [FIXED]);
	publish("slider/numFireflies", [NUM_FIREFLIES]);

	publish("toggle/showClocks", [SHOW_CLOCKS]);
	publish("slider/clockSpeed", [FLY_CLOCK_SPEED]);

	publish("toggle/neighborNudgeRule", [FLY_SYNC]);
    publish("toggle/observeAllNeighbors", [OBSERVE_ALL])
	publish("slider/nudgeAmount", [FLY_PULL]);
    publish("toggle/toggleColor", [COLOR]);
    publish("toggle/toggleRandomOmega", [RANDOM_OMEGA]);
	publish("slider/neighborRadius", [FLY_RADIUS]);
    publish("toggle/toggleRecord", [RECORD]);

};

// Num of Fireflies

subscribe("slider/numFireflies", function(value){

	// Settle the difference...
	if(value > fireflies.length){
		_addFireflies(value-fireflies.length);
	}
	if(value < fireflies.length){
		_removeFireflies(fireflies.length-value);
	}

	// Then make that the new constant.
	NUM_FIREFLIES = value;
    resetSimulation();

});

subscribe("toggle/toggleMotion", function(value){
	FIXED = value;
    resetSimulation();
});

subscribe("toggle/observeAllNeighbors", function(value){
	OBSERVE_ALL = value;
    resetSimulation();
});

subscribe("toggle/toggleColor", function (value) {
    COLOR = value;
    for (let i = 0; i < circles.length; i++) {
        const circle = circles[i].circle;
        circle.clear();
        updateCircle(fireflies[circles[i].id], circle)
    }
});

subscribe("toggle/toggleRandomOmega", function (value) {
    RANDOM_OMEGA = value;
    resetSimulation();
});

// Internal Clock

subscribe("toggle/showClocks", function(value){
	SHOW_CLOCKS = value;
});
subscribe("slider/clockSpeed", function(value){
	FLY_CLOCK_SPEED = value;
    resetSimulation();
});

// Neighbor Nudge Rule

subscribe("toggle/neighborNudgeRule", function(value){
	FLY_SYNC = value;
	if(FLY_SYNC){
		$("#nudgeAmount").removeAttribute("inactive");
		$("#neighborRadius").removeAttribute("inactive");
	}else{
		$("#nudgeAmount").setAttribute("inactive","yes");
		$("#neighborRadius").setAttribute("inactive","yes");
	}
    resetSimulation();
});
subscribe("slider/nudgeAmount", function(value){
	FLY_PULL = value;
    resetSimulation();
});
subscribe("slider/neighborRadius", function(value){
	FLY_RADIUS = value;
    resetSimulation();
});

subscribe("toggle/toggleRecord", function(value){
    const element = document.getElementById("ticks");
    if (value) {
        resetSimulation();
        element.style.display = "block";
    } else {
        element.style.display = "none";
    }
    RECORD = value;
});

// Reset Everything

subscribe("button/resetFireflies", function(){
	_resetFireflies();
    resetSimulation();
});

subscribe("button/resetEverything", function(){
	_resetConstants();
	_syncConstants();
	_resetFireflies();
    resetSimulation();
});

subscribe("button/dumpSimulation", function(){
	dumpSimulation();
});
