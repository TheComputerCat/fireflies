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
    MOTION,
    OBSERVE_ALL,
    AVG_X,
    AVG_Y,
    AVG_THETA;

var _resetConstants = function(){
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
    MOTION=true;
    OBSERVE_ALL=false;
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
window.onload = async function(){

    canvasCircles = new PIXI.Application(350,350,{backgroundColor:0xFFFFFF});
    $("#graph").appendChild(canvasCircles.view);

	// Create app!
	app = new PIXI.Application(document.body.clientWidth, document.body.clientHeight, {backgroundColor:0x000000});
	$("#game").appendChild(app.view);

	// Mouse
	Mouse.init($("#game"));

	// When loaded all assets...
	_loadAssets(manifest, function(){

		// Add fireflies!
		_addFireflies(NUM_FIREFLIES);
        addCircles();
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

function numberToColor(num) {
    num = Math.max(0, Math.min(num, NUM_FIREFLIES));
    const normalized = num / NUM_FIREFLIES;

    const red = Math.round(255 * Math.abs(Math.cos(normalized * Math.PI * 2)));
    const green = Math.round(255 * Math.abs(Math.sin(normalized * Math.PI * 2)));
    const blue = Math.round(255 * Math.abs(Math.cos((normalized + 0.5) * Math.PI * 2)));

    const color = (red << 16) | (green << 8) | blue;

    return `0x${color.toString(16).padStart(6, '0')}`;
}

function addCircles(){
    for(var i=0; i<fireflies.length; i++){
        if(fireflies.length < 25 || Math.random()<0.1){
            const circle = new PIXI.Graphics();
            circle.beginFill(numberToColor(i));
            circle.drawCircle(175, 175, 10);
            circle.endFill();
            circles.push({circle:circle, id: i});
            canvasCircles.stage.addChild(circle);
        }
    }
}

function addAvgCircle() {
    const circle = new PIXI.Graphics();
    circle.beginFill('0x000000');
    circle.drawCircle(175, 175, 10);
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
}

function updateCircles() {
    let coordinates = polarToCartesian(120*Math.sqrt(AVG_X ** 2 + AVG_Y ** 2), AVG_THETA);
    avg_circle.x = coordinates.x;
    avg_circle.y = coordinates.y;

    for(var i=0; i< circles.length; i++){
        coordinates = polarToCartesian(150, fireflies[circles[i].id].theta);
        circles[i].circle.x = coordinates.x;
        circles[i].circle.y = coordinates.y;
    }
}

function removeCircles(canvasCircles){
    for (let i = 0; i < circles.length; i++) {
        canvasCircles.stage.removeChild(circles[i].circle);
    }
    circles=[];
}

var _addFireflies = function(num){
    removeCircles(canvasCircles);
    for(var i=0; i<num; i++){
		var ff = new Firefly();
		fireflies.push(ff);
		app.stage.addChild(ff.graphics);
	}
    addCircles();
};

var _removeFireflies = function(num){
    removeCircles(canvasCircles);
	for(var i=0; i<num; i++){
		var ff = fireflies.pop();
		app.stage.removeChild(ff.graphics);
	}
    addCircles();
};

var _resetFireflies = function(){
	for(var i=0; i<fireflies.length; i++){
		var ff = fireflies[i];
		ff.clock = Math.random();
	}	
};

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
    self.omega = 1;
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

	// Update
	self.update = function(delta){

		//////////////////////
		// Position & Angle //
		//////////////////////

		// Update position
        if(MOTION){
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

        self.dtheta = FLY_CLOCK_SPEED*self.omega/60;
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
                self.dtheta = FLY_CLOCK_SPEED*(self.omega + FLY_PULL*(Math.cos(self.theta)*msin - Math.sin(self.theta)*mcos))/60;
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

	publish("slider/numFireflies", [NUM_FIREFLIES]);

	publish("toggle/showClocks", [SHOW_CLOCKS]);
	publish("slider/clockSpeed", [FLY_CLOCK_SPEED]);

	publish("toggle/neighborNudgeRule", [FLY_SYNC]);
	publish("slider/nudgeAmount", [FLY_PULL]);
	publish("slider/neighborRadius", [FLY_RADIUS]);

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

});

subscribe("toggle/toggleMotion", function(value){
	MOTION = !MOTION;
});

subscribe("toggle/observeAllNeighbors", function(value){
	OBSERVE_ALL = !OBSERVE_ALL;
});

// Internal Clock

subscribe("toggle/showClocks", function(value){
	SHOW_CLOCKS = value;
});
subscribe("slider/clockSpeed", function(value){
	FLY_CLOCK_SPEED = value
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
});
subscribe("slider/nudgeAmount", function(value){
	FLY_PULL = value;
});
subscribe("slider/neighborRadius", function(value){
	FLY_RADIUS = value;
});

// Reset Everything

subscribe("button/resetFireflies", function(){
	_resetFireflies();
});

subscribe("button/resetEverything", function(){
	_resetConstants();
	_syncConstants();
	_resetFireflies();
});
