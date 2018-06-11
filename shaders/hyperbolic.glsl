//-------------------------------------------------------
//Hyperbolic Math functions
//-------------------------------------------------------
float cosh(float x){
  float eX = exp(x);
  return (0.5 * (eX + 1.0/eX));
}
float sinh(float x){
  float eX = exp(x);
  return (0.5 * (eX - 1.0/eX));
}
float acosh(float x){ //must be more than 1
  return log(x + sqrt(x*x-1.0));
}
float asinh(float x){
  return log(x + sqrt(x*x+1.0));
}

//-------------------------------------------------------
//Hyperboloid Functions
//-------------------------------------------------------

float lorentzDot(vec4 u, vec4 v){
  return  u.x*v.x + u.y*v.y + u.z*v.z - u.w*v.w;
} /// on hyperbolold if lorentzDot(u,u) = 1, so w*w = 1 + x*x + y*y + z*z

vec4 projectToKlein(vec4 v){
  return v/v.w;
}

float hypNorm(vec4 v){
  return sqrt(abs(lorentzDot(v,v)));
}

vec4 lorentzNormalize(vec4 v){  // cannot do to a light like vector
  return v/hypNorm(v);  // projects a non-light vector to one of the two hyperboloids
}

float hypDistance(vec4 u, vec4 v){
  float bUV = -lorentzDot(u,v);
  return acosh(bUV);
}

vec4 directionFrom2Points(vec4 u, vec4 v){  // given points u and v on hyperboloid, make
  // the "direction" (velocity vector) vPrime for use in parameterizing the geodesic from u through v
  vec4 w = v + lorentzDot(u, v)*u;
  return lorentzNormalize(w);
}

vec4 pointOnGeodesic(vec4 u, vec4 vPrime, float dist){ // get point on
  // hyperboloid at distance dist on the geodesic from u through v
  return u*cosh(dist) + vPrime*sinh(dist);
}

vec4 tangentVectorOnGeodesic(vec4 u, vec4 vPrime, float dist){
  // note that this point has lorentzDot with itself of -1, so it is on other hyperboloid
  return u*sinh(dist) + vPrime*cosh(dist);
}

vec4 pointOnGeodesicAtInfinity(vec4 u, vec4 vPrime){ // returns point on the light
  // cone intersect Klein model corresponding to the point at infinity on the
  // geodesic through u and v
  return projectToKlein(u + vPrime);
}

mat4 translateByVector(vec3 v) { // trickery from Jeff Weeks' Curved Spaces app
  float dx = v.x;
  float dy = v.y;
  float dz = v.z;
  float len = sqrt(dx*dx + dy*dy + dz*dz);
  if (len == 0.0){
    return mat4(1.0);
  }
  else{
      dx /= len;
      dy /= len;
      dz /= len;
      mat4 m = mat4(vec4(0, 0, 0, dx),
                    vec4(0, 0, 0, dy),
                    vec4(0, 0, 0, dz),
                    vec4(dx,dy,dz, 0));
      mat4 m2 = m*m;
      float c1 = sinh(len);
      float c2 = cosh(len) - 1.0;
      return mat4(1.0) + c1 * m + c2 * m2;
    }
}

//---------------------------------------------------------------------
//Raymarch Primitives
//---------------------------------------------------------------------

float sphereHSDF(vec4 samplePoint, vec4 center, float radius){
  return hypDistance(samplePoint, center) - radius;
}

// A horosphere can be constructed by offseting from a standard horosphere.
// Our standard horosphere will have a center in the direction of lightPoint
// and go through the origin. Negative offsets will "shrink" it.
float horosphereHSDF(vec4 samplePoint, vec4 lightPoint, float offset){
  return log(-lorentzDot(samplePoint, lightPoint)) - offset;
}

float geodesicPlaneHSDF(vec4 samplePoint, vec4 dualPoint, float offset){
  return asinh(-lorentzDot(samplePoint, dualPoint)) - offset;
}

float geodesicCylinderHSDFplanes(vec4 samplePoint, vec4 dualPoint1, vec4 dualPoint2, float radius){
  // defined by two perpendicular geodesic planes
  float dot1 = -lorentzDot(samplePoint, dualPoint1);
  float dot2 = -lorentzDot(samplePoint, dualPoint2);
  return asinh(sqrt(dot1*dot1 + dot2*dot2)) - radius;
}

float geodesicCylinderHSDFends(vec4 samplePoint, vec4 lightPoint1, vec4 lightPoint2, float radius){
  // defined by two light points (at ends of the geodesic) whose lorentzDot is 1
  return acosh(sqrt(2.0*-lorentzDot(lightPoint1, samplePoint)*-lorentzDot(lightPoint2, samplePoint))) - radius;
}

float geodesicCubeHSDF(vec4 samplePoint, vec4 dualPoint0, vec4 dualPoint1, vec4 dualPoint2, vec3 offsets){
  float plane0 = max(abs(geodesicPlaneHSDF(samplePoint, dualPoint0, 0.0))-offsets.x,0.0); 
  float plane1 = max(abs(geodesicPlaneHSDF(samplePoint, dualPoint1, 0.0))-offsets.y,0.0); 
  float plane2 = max(abs(geodesicPlaneHSDF(samplePoint, dualPoint2, 0.0))-offsets.z,0.0);
  return sqrt(plane0*plane0+plane1*plane1+plane2*plane2) - 0.01; 
} 

//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

vec4 texcube(sampler2D tex, vec4 samplePoint, vec4 N, float k, mat4 toOrigin){
  vec4 newSP = samplePoint * toOrigin;
  vec3 p = mod(newSP.xyz,1.0);
  vec3 n = lorentzNormalize(N*toOrigin).xyz; //Very hacky you are warned
  vec3 m = pow(abs(n), vec3(k));
  vec4 x = texture2D(tex, p.yz);
  vec4 y = texture2D(tex, p.zx);
  vec4 z = texture2D(tex, p.xy);
  return (x*m.x + y*m.y + z*m.z) / (m.x+m.y+m.z);
}

vec3 phongModel(vec4 samplePoint, vec4 T, vec4 N, mat4 totalFixMatrix, mat4 invObjectBoost, bool isGlobal){
    float ambient = 0.1;
    vec3 baseColor = vec3(0.0,1.0,1.0);
    if(isGlobal)
      baseColor = texcube(texture, samplePoint, N, 4.0, cellBoost * invObjectBoost).xyz;
    else
      baseColor = texcube(texture, samplePoint, N, 4.0, mat4(1.0)).xyz;
    vec3 color = baseColor * ambient; //Setup up color with ambient component
    for(int i = 0; i<8; i++){ //8 is the size of the lightPosition array
      if(lightIntensities[i] != vec4(0.0)){
        vec4 translatedLightPosition = lightPositions[i] * invCellBoost * totalFixMatrix;
        float distToLight = hypDistance(translatedLightPosition, samplePoint);
        float att;
        if(attnModel == 1) //Inverse Linear
          att  = 0.75/ (0.01+lightIntensities[i].w * distToLight);  
        else if(attnModel == 2) //Inverse Square
          att  = 1.0/ (0.01+lightIntensities[i].w * distToLight* distToLight);
        else if(attnModel == 4) // Inverse Cube
          att = 1.0/ (0.01+lightIntensities[i].w*distToLight*distToLight*distToLight);
        else if(attnModel == 3) //Physical
          att  = 1.0/ (0.01+lightIntensities[i].w*cosh(2.0*distToLight)-1.0);
        else //None
          att  = 0.25; //if its actually 1 everything gets washed out
        vec4 L = -directionFrom2Points(samplePoint, translatedLightPosition);
        vec4 R = 2.0*lorentzDot(L, N)*N - L;
        //Calculate Diffuse Component
        float nDotL = max(-lorentzDot(N, L),0.0);
        vec3 diffuse = lightIntensities[i].rgb * nDotL;
        //Calculate Specular Component
        float rDotT = max(lorentzDot(R, T),0.0);
        vec3 specular = lightIntensities[i].rgb * pow(rDotT,10.0);
        //Compute final color
        color += att*((diffuse*baseColor) + specular);
      }
    }
    return color;
}