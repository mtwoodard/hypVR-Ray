var raymarch = new THREE.ShaderMaterial({
  uniforms:{
    screenResolution: {type:"v2", value:new THREE.Vector2(window.innerWidth, window.innerHeight)}
  },
  vertexShader: `
    void main()
    {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position.xyz, 1.0);
    }
  `,
  fragmentShader: `
  const int MAX_MARCHING_STEPS = 255;
  const float MIN_DIST = 0.0;
  const float MAX_DIST = 100.0;
  const float EPSILON = 0.0001;

  uniform vec2 screenResolution;

  //Helps with full screen shaders
  //From //https://github.com/hughsk/glsl-square-frame
  vec2 squareFrame(vec2 screenSize) {
    vec2 position = 2.0 * (gl_FragCoord.xy / screenSize.xy) - 1.0;
    position.x *= screenSize.x / screenSize.y;
    return position;
  }

  vec2 squareFrame(vec2 screenSize, vec2 coord) {
    vec2 position = 2.0 * (coord.xy / screenSize.xy) - 1.0;
    position.x *= screenSize.x / screenSize.y;
    return position;
  }

  //https://github.com/stackgl/glsl-look-at/blob/gh-pages/index.glsl
  mat3 calcLookAtMatrix(vec3 origin, vec3 target, float roll) {
    vec3 rr = vec3(sin(roll), cos(roll), 0.0);
    vec3 ww = normalize(target - origin);
    vec3 uu = normalize(cross(ww, rr));
    vec3 vv = normalize(cross(uu, ww));
    return mat3(uu, vv, ww);
  }

  //https://github.com/stackgl/glsl-camera-ray
  vec3 getRay(mat3 camMat, vec2 screenPos, float lensLength) {
    return normalize(camMat * vec3(screenPos, lensLength));
  }
  vec3 getRay(vec3 origin, vec3 target, vec2 screenPos, float lensLength) {
    mat3 camMat = calcLookAtMatrix(origin, target, 0.0);
    return getRay(camMat, screenPos, lensLength);
  }

  float sphereSDF(vec3 samplePoint){
    return length(samplePoint) - 1.0;
  }

  float sceneSDF(vec3 samplePoint){
    return sphereSDF(samplePoint);
  }

  float shortestDistanceToSurface(vec3 rO, vec3 rD, float start, float end){
    float depth = start;
    for(int i = 0; i< MAX_MARCHING_STEPS; i++){
      float dist = sceneSDF(rO+depth*rD);
      if(dist < EPSILON){
        return depth;
      }
      depth += dist;
      if(depth >= end){
        return end;
      }
    }
    return end;
  }

  void main(){
    vec2 uv = gl_FragCoord.xy/screenResolution;
    float cameraAngle = 0.0;
    float cameraRadius = 20.0;

    vec2 screenPosition = squareFrame(screenResolution);
    float lensLength = 2.5;
    vec3 rayOrigin = vec3(cameraRadius*sin(cameraAngle), 0.0, cameraRadius*cos(cameraAngle));
    vec3 rayTarget = vec3(0,0,0);
    vec3 rayDirection = getRay(rayOrigin, rayTarget, screenPosition, lensLength);

    float dist = shortestDistanceToSurface(rayOrigin, rayDirection, MIN_DIST, MAX_DIST);
    if(dist > MAX_DIST - EPSILON){
      //Didn't hit anything
      gl_FragColor = vec4(0.1,0.1,0.1,1.0);
      return;
    }
    gl_FragColor = vec4(0.35,0.1,0.35,1.0);
  }
  `,
  transparent:true
});
