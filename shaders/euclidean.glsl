mat4 translateByVector(vec3 v) 
{
  float dx = v.x;
  float dy = v.y;
  float dz = v.z;
  return mat4(
    vec4(1.0, 0, 0, dx),
    vec4(0, 1.0, 0, dy),
    vec4(0, 0, 1.0, dz),
    vec4(dx, dy, dz, 1.0) );
}

vec4 lorentzNormalize(vec4 v)
{
  v.w = 1.0;
  return v;
}

float lorentzDot(vec4 u, vec4 v)
{
  return dot(u.xyz,v.xyz);
}

float hypDistance(vec4 u, vec4 v)
{
  return distance( u.xyz, v.xyz );
}

vec4 projectToKlein(vec4 v)
{
  // We are already effectively Klein (i.e. lines are straight in the model)
  v.w = 1.0;
  return v;
}

vec4 directionFrom2Points(vec4 u, vec4 v)
{
  vec4 w = v - u; // feels backwards
  w.xyz = normalize( w.xyz );
  return lorentzNormalize(w);
}

vec4 pointOnGeodesic(vec4 u, vec4 vPrime, float dist)
{ 
  // get point at distance dist on the geodesic from u through v
  return projectToKlein( u + vPrime*dist );
}

vec4 tangentVectorOnGeodesic(vec4 u, vec4 vPrime, float dist)
{
  // the negative here is to match what we do in hyperbolic.glsl
  return -projectToKlein( u + vPrime*dist );
}

vec4 pointOnGeodesicAtInfinity(vec4 u, vec4 vPrime)
{ 
  // I'm not yet sure what we should be doing here.
  return projectToKlein(u + vPrime);
}

float sphereHSDF(vec4 samplePoint, vec4 center, float radius)
{
  return hypDistance(samplePoint, center) - radius;
}

float geodesicPlaneHSDF(vec4 samplePoint, vec4 dualPoint, float offset)
{
  return sphereHSDF(samplePoint, vec4(0.0), offset);
}

//
// Functions below this don't apply, but we need them included to make the shader compile.
//

float horosphereHSDF(vec4 samplePoint, vec4 lightPoint, float offset)
{
  return 0.0;
}

//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

vec4 texcube(sampler2D tex, vec4 samplePoint, vec4 N, float k){
  vec3 m = pow(abs(N.xyz), vec3(k));
  vec4 x = texture2D(tex, samplePoint.yz);
  vec4 y = texture2D(tex, samplePoint.zx);
  vec4 z = texture2D(tex, samplePoint.xy);
  return (x*m.x + y*m.y + z*m.z) / (m.x+m.y+m.z);
}


vec3 phongModel(vec4 samplePoint, vec4 T, vec4 N, mat4 totalFixMatrix, mat4 invObjectBoost, bool isGlobal){
    float ambient = 0.1;
    vec3 baseColor = vec3(0.0,1.0,1.0);
    if(isGlobal)
      return baseColor = texcube(texture, samplePoint, N, 4.0).xyz; //Helps see what's wrong with texcube currently - remove return when fixed
    else
      baseColor = texcube(texture, samplePoint, N, 4.0).xyz; 
    vec3 color = baseColor * ambient; //Setup up color with ambient component
    for(int i = 0; i<8; i++){ //8 is the size of the lightPosition array
      if(lightIntensities[i] != vec4(0.0)){
        //vec4 translatedLightPosition = lightPositions[i] * invCellBoost * totalFixMatrix;

        float distToLight = distance(lightPositions[i], samplePoint);
        float att;
        if(attnModel == 1) //Inverse Linear
          att  = 0.75/ (0.01+lightIntensities[i].w * distToLight);  
        else if(attnModel == 2) //Inverse Square
          att  = 1.0/ (0.01+lightIntensities[i].w * distToLight* distToLight);
        else if(attnModel == 4) // Inverse Cube
          att = 1.0/ (0.01+lightIntensities[i].w*distToLight*distToLight*distToLight);
        else if(attnModel == 3) //Physical
          att  = 1.0/ (0.01+lightIntensities[i].w*cos(2.0*distToLight)-1.0);
        else //None
          att  = 0.25; //if its actually 1 everything gets washed out

        vec4 L = lightPositions[i] - samplePoint;
        vec4 R = 2.0*dot(L, N)*N - L;
        //Calculate Diffuse Component
        float nDotL = max(dot(N, L),0.0);
        vec3 diffuse = lightIntensities[i].rgb * nDotL;
        //Calculate Specular Component
        float rDotT = max(dot(R, T),0.0);
        vec3 specular = lightIntensities[i].rgb * pow(rDotT,10.0);
        //Compute final color
        color += att*((diffuse*baseColor) + specular);
      }
    }
    return color;
}