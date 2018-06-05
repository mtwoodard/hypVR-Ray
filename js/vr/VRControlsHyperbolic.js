/**
 * @author dmarcos / https://github.com/dmarcos
 with additions by https://github.com/hawksley and https://github.com/henryseg
 */

THREE.VRControls = function ( camera, done ) {
	this.phoneVR = new PhoneVR();
	var speed = 0.2;
	this._camera = camera;
	this._oldVRState;
	this._defaultPosition = [0,0,10];
	this._lastTotalRotation = new THREE.Quaternion();

	this._init = function () {
		var self = this;
		self._oldVRState = undefined;
		if (!navigator.getVRDisplays && !navigator.mozGetVRDevices && !navigator.getVRDevices) {
			return;
		}
		if (navigator.getVRDisplays) {
			navigator.getVRDisplays().then( gotVRDisplay );
		}else if ( navigator.getVRDevices ) {
			navigator.getVRDevices().then( gotVRDevices );
		} else {
			navigator.mozGetVRDevices( gotVRDevices );
		}

		function gotVRDisplay( devices) {
			var vrInput;
			var error;
			for ( var i = 0; i < devices.length; ++i ) {
				if ( devices[i] instanceof VRDisplay ) {
					vrInput = devices[i]
					self._vrInput = vrInput;
					break; // We keep the first we encounter
				}
			}
		}

		function gotVRDevices( devices ) {
			var vrInput;
			var error;
			for ( var i = 0; i < devices.length; ++i ) {
				if ( devices[i] instanceof PositionSensorVRDevice ) {
					vrInput = devices[i]
					self._vrInput = vrInput;
					break; // We keep the first we encounter
				}
			}
		}
		
	};

	this.manualRotation = new THREE.Quaternion();

	this.manualControls = {
      65 : {index: 1, sign: 1, active: 0},  // a
      68 : {index: 1, sign: -1, active: 0}, // d
      87 : {index: 0, sign: 1, active: 0},  // w
      83 : {index: 0, sign: -1, active: 0}, // s
      81 : {index: 2, sign: -1, active: 0}, // q
      69 : {index: 2, sign: 1, active: 0},  // e
      38 : {index: 3, sign: 1, active: 0},  // up
      40 : {index: 3, sign: -1, active: 0}, // down
      37 : {index: 4, sign: -1, active: 0}, // left
      39 : {index: 4, sign: 1, active: 0},   // right
      222 : {index: 5, sign: 1, active: 0}, // single quote
      191 : {index: 5, sign: -1, active: 0},   // fwd slash
      73 : {index: 7, sign: -1, active: 0},   // i
      75 : {index: 7, sign: 1, active: 0},   // k
      74 : {index: 6, sign: 1, active: 0},   // j
      76 : {index: 6, sign: -1, active: 0}   // l
    };

	this.manualRotateRate = new Float32Array([0.0, 0.0, 0.0]);
	this.manualMoveRate = new Float32Array([0.0, 0.0, 0.0]);
	this.manualParabolicRate = new Float32Array([0.0, 0.0]);
	this.updateTime = 0;
	this.update = function() {
		var camera = this._camera;
		var vrState = this.getVRState();
		var manualRotation = this.manualRotation;
		var oldTime = this.updateTime;
		var newTime = Date.now();
		this.updateTime = newTime;

		//Relevant transform variables
		var interval = (newTime - oldTime) * 0.001;
		var m;
		var offset = new THREE.Vector3();

		//Get position info from hmd
		if (vrState !== null && vrState.hmd.lastPosition !== undefined && vrState.hmd.position[0] !== 0) {
			position.x = -vrState.hmd.position[0];
			position.y = -vrState.hmd.position[1];
			position.z = -vrState.hmd.position[2];
			position.add(offset); //we'll be able to add in controller support here
		}

		//Otherwise allow manual control via arrow keys
		else if (this.manualMoveRate[0] != 0 || this.manualMoveRate[1] != 0 || this.manualMoveRate[2] != 0) {
		    offset = getFwdVector().multiplyScalar(speed * guiInfo.eToHScale * interval * this.manualMoveRate[0]).add(
		      		   getRightVector().multiplyScalar(speed * guiInfo.eToHScale * interval * this.manualMoveRate[1])).add(
						 getUpVector().multiplyScalar(speed * guiInfo.eToHScale * interval * this.manualMoveRate[2]));
			position.add(offset);
		}

		//we need to add position to a cumulative cellPos since our vr headset will reset any changes made to position.
		var p = new THREE.Vector3().addVectors(position, cellPos); // since position.add permanently changes the position we need to make a temp vec3
		m = translateByVector(geometry, p);
		currentBoost.copy(m);
		//console.log(position);

		//Check if we have moved outside of the cell
		var fixIndex = fixOutsideCentralCell(currentBoost, cellPos);
		if(fixIndex != -1){
			cellBoost = cellBoost.premultiply(invGens[fixIndex]);
			cellBoost.elements = gramSchmidt(geometry, cellBoost.elements);
			invCellBoost.getInverse(cellBoost);
		}

		//Do manual rotation from keys
		var update = new THREE.Quaternion(this.manualRotateRate[0] * 0.2 * interval,
	                               			this.manualRotateRate[1] * 0.2 * interval,
	                               			this.manualRotateRate[2] * 0.2 * interval, 1.0);
		update.normalize();
		if(update !== undefined){
			//rotation.multiply(update);
			//m = new THREE.Matrix4().makeRotationFromQuaternion(rotation);			
			//currentBoost.premultiply(m.getInverse(m)); //sets m to the inverse of m
		}
		
		// Applies head rotation from sensors data.	
		if (vrState !== null && vrState.hmd.lastRotation !== undefined) { //mobile devices/vr headsets			
			rotation = new THREE.Quaternion(vrState.hmd.rotation[0], vrState.hmd.rotation[1], vrState.hmd.rotation[2], vrState.hmd.rotation[3]);
			m = new THREE.Matrix4().makeRotationFromQuaternion(rotation);
			currentBoost.premultiply(m.getInverse(m)); //sets m to the inverse of m
		}

		currentBoost.elements = gramSchmidt(geometry, currentBoost.elements);
	};

	this.zeroSensor = function() {
		var vrInput = this._vrInput;
		if ( !vrInput ) {
			return null;
		}
		vrInput.zeroSensor();
	};

	this.getVRState = function() {
		var vrInput = this._vrInput;
		var oldVRState = this._oldVRState;
		var orientation;
		var position;
		var vrState;
		var orientation;
		var position;
		var vrState;

		if ( vrInput ) {
			if (vrInput.getState !== undefined) {
				var rotation	= vrInput.getState().orientation;
				orientation = [rotation.x, rotation.y, rotation.z, rotation.w];
				position = vrInput.getState().position;
				position = [position.x, position.y, position.z];
			}
			else {
				var framedata = new VRFrameData();
				vrInput.getFrameData(framedata);
				if(framedata.pose.orientation !== null  && framedata.pose.position !== null){
					var o = new THREE.Quaternion(framedata.pose.orientation[0], framedata.pose.orientation[1], framedata.pose.orientation[2], framedata.pose.orientation[3]);
					var v = new THREE.Vector3(framedata.pose.position[0], framedata.pose.position[1], framedata.pose.position[2]);
					v.applyQuaternion(o);
					console.log(v);
					orientation = framedata.pose.orientation;
					position = framedata.pose.position;
				}
			}
		}
		else if (this.phoneVR.rotationQuat()) {
			var rotation = this.phoneVR.rotationQuat();
			orientation = [rotation.x, rotation.y, rotation.z, rotation.w];
			position = this._defaultPosition;
		}
		else {
			return null;
		}

		if (orientation == null) {
			return null;
		}
		vrState = {
			hmd : {
				rotation : [
					orientation[0],
					orientation[1],
					orientation[2],
					orientation[3]
				],
				position : [
					position[0],
					position[1],
					position[2]
				]
			}
		};

		if (oldVRState !== undefined) {
			vrState.hmd.lastPosition = oldVRState.hmd.position;
			vrState.hmd.lastRotation = oldVRState.hmd.rotation;
		}

		this._oldVRState = vrState;

		return vrState;
	};
	this._init();
};

//Listen for double click event to enter full-screen VR mode

document.body.addEventListener( 'click', function(event) {
	if (event.target.id === "vr-icon") {
		event.target.style.display = "none";
		effect.phoneVR.setVRMode(!renderer.phoneVR.isVRMode);
	}

 	if (effect.phoneVR.orientationIsAvailable()) {
  	effect.setFullScreen( true );
		if (typeof window.screen.orientation !== 'undefined' && typeof window.screen.orientation.lock === 'function') {
		  window.screen.orientation.lock('landscape-primary');
		}
	}
});

/*
Listen for keyboard events
*/
function onkey(event) {
  event.preventDefault();

  if (event.keyCode == 90) { // z
    controls.zeroSensor(); //zero rotation
  } else if (event.keyCode == 70) { //f
    effect.setFullScreen(true); //fullscreen
  } else if (event.keyCode == 86 || event.keyCode == 13 || event.keyCode == 32 ) { // v or 'enter' or 'space' for VR mode
    effect.toggleVRMode();
  }
}

window.addEventListener("keydown", onkey, false);

//hold down keys to do rotations and stuff
function key(event, sign) {
  var control = controls.manualControls[event.keyCode];
  if (control == undefined || sign === 1 && control.active || sign === -1 && !control.active) {
    return;
  }

  control.active = (sign === 1);
  if (control.index <= 2){
    controls.manualRotateRate[control.index] += sign * control.sign;
  } else if (control.index <= 5) {
    controls.manualMoveRate[control.index - 3] += sign * control.sign;
  } else {
    controls.manualParabolicRate[control.index - 6] += sign * control.sign;
  }
}

document.addEventListener('keydown', function(event) { key(event, 1); }, false);
document.addEventListener('keyup', function(event) { key(event, -1); }, false);

//tap and hold to move
function tap(event, sign) {
    controls.manualMoveRate[0] += sign;
}

document.addEventListener('touchstart', function(event) { tap(event, 1); }, false);
document.addEventListener('touchend', function(event) { tap(event, -1); }, false);
