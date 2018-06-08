THREE.VRControls = function(done){
    this.phoneVR = new PhoneVR();
    var speed = 0.2;
    this._oldVRState;
    this.defaultPosition = new THREE.Vector3();
    this.manualRotation = new THREE.Quaternion();
    this.manualRotateRate = new Float32Array([0.0, 0.0, 0.0]);
    this.manualMoveRate = new Float32Array([0.0, 0.0, 0.0]);
    this.updateTime = 0;
    
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
    };
    
    this._init = function(){
        this._oldVRState = undefined;
        if(!navigator.getVRDisplays && !navigator.mozGetVRDevices && !navigator.getVRDevices) 
            return;
        if(navigator.getVRDisplays)
            navigator.getVRDisplays().then(gotVRDisplay);
        else if(navigator.getVRDevices)
            navigator.getVRDevices().then(gotVRDevices);
        else
            navigator.mozGetVRDevices(gotVRDevices);

        function gotVRDisplay(devices){
            var vrInput;
            var error;
            for(var i = 0; i < devices.length; i++){
                if(devices[i] instanceof VRDisplay){
                    vrInput = devices[i];
                    this._vrInput = vrInput;
                    break;
                }
            }
        }

        function gotVRDevices(devices){
            var vrInput;
            var error;
            for(var i = 0; i < devices.length; i++){
                if(devices[i] instanceof PositionSensorVRDevice){
                    vrInput = devices[i];
                    this._vrInput = vrInput;
                    break;
                }
            }
        }
    };

    this._init();

    this.update = function(){
        var vrState = this.getVRState();
        var manualRotation = this.manualRotation;
        var oldTime = this.updateTime;
        var newTime = Date.now();
        this.updateTime = newTime;

        //--------------------------------------------------------------------
        // Translation
        //--------------------------------------------------------------------
        var deltaTime = (newTime - oldTime) * 0.001; 
        var m;
        var deltaPosition = new THREE.Vector3();
       // if(vrState !== null && vrState.hmd.lastPosition !== undefined && vrState.hmd.position[0] !== 0){
            //var position = vrState.hmd.lastPosition.applyQuaternion
         //   deltaPosition = new THREE.Vector3().subVectors(vrState.hmd.position, vrState.hmd.lastPosition).multiplyScalar(guiInfo.eToHScale);
        //}
        if(this.manualMoveRate[0] !== 0 || this.manualMoveRate[1] !== 0 || this.manualMoveRate[2] !== 0){
            deltaPosition = getFwdVector().multiplyScalar(speed * guiInfo.eToHScale * deltaTime * this.manualMoveRate[0]).add(
                getRightVector().multiplyScalar(speed * guiInfo.eToHScale * deltaTime * this.manualMoveRate[1])).add(
                getUpVector().multiplyScalar(speed * guiInfo.eToHScale * deltaTime * this.manualMoveRate[2]));
        }
        if(deltaPosition !== undefined){
            m = translateByVector(g_geometry, deltaPosition);
            g_currentBoost.premultiply(m);
        }
        var fixIndex = fixOutsideCentralCell(g_currentBoost); //moves camera back to main cell
        g_currentBoost.elements = gramSchmidt(g_geometry, g_currentBoost.elements);
        if(fixIndex !== -1){
            cellBoost = cellBoost.premultiply(invGens[fixIndex]); //keeps track of how many cells we've moved 
            cellBoost.elements = gramSchmidt(g_geometry, cellBoost.elements);
            invCellBoost.getInverse(cellBoost);
        }

        //--------------------------------------------------------------------
        // Rotation
        //--------------------------------------------------------------------
        var deltaRotation = new THREE.Quaternion(this.manualRotateRate[0] * speed * deltaTime,
                                                    this.manualRotateRate[1] * speed * deltaTime,
                                                    this.manualRotateRate[2] * speed * deltaTime, 1.0);
        deltaRotation.normalize();
        if(deltaRotation !== undefined){
            g_rotation.multiply(deltaRotation.inverse());
            m = new THREE.Matrix4().makeRotationFromQuaternion(deltaRotation);
            g_currentBoost.premultiply(m);
        }

        if(vrState !== null && vrState.hmd.lastRotation !== undefined){
            g_rotation = vrState.hmd.rotation;
            deltaRotation.multiply(vrState.hmd.lastRotation.inverse(), vrState.hmd.rotation);
            m = new THREE.Matrix4().makeRotationFromQuaternion(deltaRotation);
            g_currentBoost.copy(m.getInverse(m));
        }

        g_currentBoost.elements = gramSchmidt(g_geometry, g_currentBoost.elements);
    };

    this.zeroSensor = function(){
        if(!this._vrInput) return null;
        this._vrInput.zeroSensor();
    };

    this.getVRState = function(){
        var vrInput = this._vrInput;
        //console.log(this._vrInput);
        var oldVRState = this._oldVRState;
        var orientation;
        var pos;
        var vrState;

        if(vrInput){
            if(vrInput.getState !== undefined){ 
                orientation = vrInput.getState().orientation;
                orientation = new THREE.Quaternion(orientation.x, orientation.y, orientation.z, orientation.w);
				pos = vrInput.getState().position;
				pos = new THREE.Vector3(pos.x, pos.y, pos.z);
				//pos.applyQuaternion(orientation);
            }
            else{
                var framedata = new VRFrameData();
				vrInput.getFrameData(framedata);
				if(framedata.pose.orientation !== null  && framedata.pose.position !== null){
					orientation = new THREE.Quaternion(framedata.pose.orientation[0], framedata.pose.orientation[1], framedata.pose.orientation[2], framedata.pose.orientation[3]);
                    pos = new THREE.Vector3(framedata.pose.position[0], framedata.pose.position[1], framedata.pose.position[2]);
					//pos.applyQuaternion(orientation);
				}
            }
        }
        else if(this.phoneVR.rotationQuat()){
            orientation = this.phoneVR.rotationQuat();
            orientation = new THREE.Quaternion(orientation.x, orientation.y, orientation.z, orientation.w);
			pos = this._defaultPosition;
        }

        else return null;
        if(orientation === null) return null;

        vrState = {
            hmd: {
                rotation: orientation,
                position: pos
            }
        };
        
        if(oldVRState !== undefined){
            vrState.hmd.lastPosition = oldVRState.hmd.position;
            vrState.hmd.lastRotation = oldVRState.hmd.rotation;
        }

        this._oldVRState = vrState;
        return vrState;
    };

};

//--------------------------------------------------------------------
// Listens for double click to enter fullscreen VR mode
//--------------------------------------------------------------------
document.body.addEventListener('click', function(event){
    if(event.target.id === "vr-icon"){
        event.target.style.display = "none";
        g_effect.phoneVR.setVRMode(!renderer.phoneVR.isVRMode);
    }
    if(g_effect.phoneVR.orientationIsAvailable()){
        g_effect.setFullScreen(true);
        if(typeof window.screen.orientation !== 'undefined' && typeof window.screen.orientation.lock === 'function')
            window.screen.orientation.lock('landscape-primary');
    }
});

//--------------------------------------------------------------------
// Handle keyboard events
//--------------------------------------------------------------------
function onkey(event){
    event.preventDefault();

    if(event.keyCode == 90) // z
        g_controls.zeroSensor();
    else if(event.keyCode == 70) // f
        g_effect.setFullScreen(true);
    else if(event.keyCode == 86 || event.keyCode == 13 || event.keyCode == 32)
        g_effect.toggleVRMode();
}

window.addEventListener("keydown", onkey, false);

//--------------------------------------------------------------------
// Listen for keys for movement/rotation
//--------------------------------------------------------------------
function key(event, sign){
    var control = g_controls.manualControls[event.keyCode];
    if(control == undefined || sign === 1 && control.active || sign == -1 && !control.active) return;

    control.active = (sign === 1);
    if (control.index <= 2)
        g_controls.manualRotateRate[control.index] += sign * control.sign;
    else if (control.index <= 5)
        g_controls.manualMoveRate[control.index - 3] += sign * control.sign;
}

document.addEventListener('keydown', function(event){key(event, 1);}, false);
document.addEventListener('keyup', function(event){key(event, -1);}, false);

//--------------------------------------------------------------------
// Phone screen tap for movement
//--------------------------------------------------------------------
function tap(event, sign){
    g_controls.manualMoveRate[0] += sign;
}

document.addEventListener('touchstart', function(event){tap(event, 1);}, false);
document.addEventListener('touchend', function(event){tap(event, -1);}, false);
