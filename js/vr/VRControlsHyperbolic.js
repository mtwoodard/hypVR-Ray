/**
 * Based off code created by:
 * dmarcos / https://github.com/dmarcos
 * hawksley / https://github.com/hawksley 
 */

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
        var self = this;
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
                    self._vrInput = vrInput;
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
                    self._vrInput = vrInput;
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
        var deltaPosition = new THREE.Vector3();
        if(vrState !== null && vrState.hmd.lastPosition !== undefined && vrState.hmd.position[0] !== 0){
            var quat = vrState.hmd.rotation.clone().inverse();
            deltaPosition = new THREE.Vector3().subVectors(vrState.hmd.position, vrState.hmd.lastPosition).applyQuaternion(quat);
        }
        if(this.manualMoveRate[0] !== 0 || this.manualMoveRate[1] !== 0 || this.manualMoveRate[2] !== 0){
            deltaPosition = getFwdVector().multiplyScalar(speed * guiInfo.eToHScale * deltaTime * this.manualMoveRate[0]).add(
                getRightVector().multiplyScalar(speed * guiInfo.eToHScale * deltaTime * this.manualMoveRate[1])).add(
                getUpVector().multiplyScalar(speed * guiInfo.eToHScale * deltaTime * this.manualMoveRate[2]));
        }
        if(deltaPosition !== undefined){
            var m = translateByVector(g_geometry, deltaPosition);
            g_currentBoost.premultiply(m);
        }
        var fixIndex = fixOutsideCentralCell(g_currentBoost); //moves camera back to main cell
        g_currentBoost.gramSchmidt(g_geometry);
        if(fixIndex !== -1){
           cellBoost = cellBoost.premultiply(invGens[fixIndex]); //keeps track of how many cells we've moved 
           cellBoost.gramSchmidt(g_geometry);
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
            g_rotation.multiply(deltaRotation);
            m = new THREE.Matrix4().makeRotationFromQuaternion(deltaRotation.inverse());
            g_currentBoost.premultiply(m);
        }

        if(vrState !== null && vrState.hmd.lastRotation !== undefined){
            rotation = vrState.hmd.rotation;
            deltaRotation.multiplyQuaternions(vrState.hmd.lastRotation.inverse(), vrState.hmd.rotation);
            m = new THREE.Matrix4().makeRotationFromQuaternion(deltaRotation.inverse());
            g_currentBoost.premultiply(m);
        }

        g_currentBoost.gramSchmidt(g_geometry);
    };

    this.zeroSensor = function(){
        if(!this._vrInput) return null;
        this._vrInput.zeroSensor();
    };

    this.getVRState = function(){
        var vrInput = this._vrInput;
        var oldVRState = this._oldVRState;
        var orientation = new THREE.Quaternion();
        var pos = new THREE.Vector3();
        var vrState;

        if(vrInput){
            if(vrInput.getState !== undefined){ 
                orientation.fromArray(vrInput.getState().orientation);
				pos.fromArray(vrInput.getState().position);
            }
            else{
                var framedata = new VRFrameData();
				vrInput.getFrameData(framedata);
				if(framedata.pose.orientation !== null  && framedata.pose.position !== null){
                    orientation.fromArray(framedata.pose.orientation);
                    pos.fromArray(framedata.pose.position);
				}
            }
        }
        else if(this.phoneVR.rotationQuat()){
            orientation.fromArray(this.phoneVR.rotationQuat());
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