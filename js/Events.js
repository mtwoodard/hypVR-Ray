//--------------------------------------------------------------------
// Handle window resize
//--------------------------------------------------------------------
var onResize = function(){
        g_effect.setSize(window.innerWidth, window.innerHeight);
        if(g_material != null){
            g_material.uniforms.screenResolution.value.x = window.innerWidth;
            g_material.uniforms.screenResolution.value.y = window.innerHeight;
        }
  }
  window.addEventListener('resize', onResize, false);

//--------------------------------------------------------------------
// Handle VR Controllers
//-------------------------------------------------------------------- 
  var g_controllerMove = false;

  var onControllerConnected = function(event){
    var controller = event.detail;
    console.log(controller.inspect());  
    controller.addEventListener('primary press began', function(){ g_controllerMove = true; });
    controller.addEventListener('primary press ended', function(){ g_controllerMove = false; });

    //This only works for OpenVR controllers
    //For example the oculus uses thumbstick instead of thumbpad
    controller.addEventListener('thumbpad axes changed', function(event){
        var HueSat = axesToHueSat(event.axes);
        console.log(HueSat);
        if(HueSat.x !== 0.5 && HueSat.y !== 0){
            var HSV = new THREE.Vector3(HueSat.x, HueSat.y, 1.0);
            var RGB = HSVtoRGB(HSV);
            lightIntensities[event.target.gamepad.index + 4] = new THREE.Vector4(RGB.x, RGB.y, RGB.z, 2.0);
        }
    });
  }
  
  //Converts axes value [0-1, 0-1] to usable hue and saturation values
  var axesToHueSat  = function(axes){
    var saturation = Math.sqrt(axes[0] * axes[0] + axes[1] * axes[1]);
    var hue = Math.atan2(axes[0], axes[1])/Math.PI * 0.5;
    if(hue < 0) hue += 1;
    return new THREE.Vector2(hue, saturation);
  }

  //From http://www.easyrgb.com/en/math.php
  var HSVtoRGB = function(HSV){
    var H = HSV.x; var S = HSV.y; var V = HSV.z;
    var R,G,B;
    if(S === 0){
        R = V; G = V; B = V;
    }
    else{
        var _h = H * 6;
        if(_h === 6) _h = 0;
        var _i = Math.trunc(_h); //cast to int may need to be floor/ceil instead
        var _1 = V * (1 - S);
        var _2 = V * (1 - S * (_h - _i));
        var _3 = V * (1 - S * (1 - (_h - _i)));

        var _r, _g, _b;
        if(_i === 0)      {_r =  V; _g = _3; _b = _1;}
        else if(_i === 1) {_r = _2; _g =  V; _b = _1;}
        else if(_i === 2) {_r = _1; _g =  V; _b = _3;}
        else if(_i === 3) {_r = _1; _g = _2; _b =  V;}
        else if(_i === 4) {_r = _3; _g = _1; _b =  V;}
        else              {_r =  V; _g = _1; _b = _2;}

        R = _r; B = _b; G = _g;
    }
    return new THREE.Vector3(R,G,B);
  }
  
  window.addEventListener('vr controller connected', onControllerConnected);

//--------------------------------------------------------------------
// Listens for double click to enter fullscreen VR mode
//--------------------------------------------------------------------
document.body.addEventListener('click', function(event){
    if(event.target.id === "vr-icon"){
        event.target.style.display = "none";
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

//--------------------------------------------------------------------
// Check if mobile
//--------------------------------------------------------------------
//from detectmobilebrowsers.com
var mobileCheck = function(){
    var check = false;
    if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(navigator.userAgent)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0,4))){
        check = true;
    }
    return check;
}

//--------------------------------------------------------------------
// Check if mobile
// From - https://jsfiddle.net/art388yv/477/
//--------------------------------------------------------------------
function takeScreenshot() {
    // open in new window like this
    var w = window.open('', '');
    w.document.title = "Screenshot";
    //w.document.body.style.backgroundColor = "red";
    var img = new Image();
    // Without 'preserveDrawingBuffer' set to true, we must render now
    g_material.uniforms.screenResolution.value.x = g_screenShotResolution.x;
    g_material.uniforms.screenResolution.value.y = g_screenShotResolution.y;
    g_effect.setSize(g_screenShotResolution.x, g_screenShotResolution.y);
    g_effect.render(scene, camera, animate);
    //renderer.render(scene, camera);
    img.src = renderer.domElement.toDataURL();
    w.document.body.appendChild(img);
    onResize(); //Resets us back to window size
}