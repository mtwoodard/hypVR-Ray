mat4 translateByVector(vec3 v) 
{
  float dx = v.x;
  float dy = v.y;
  float dz = v.z;
  return mat4(
    vec4(1.0, 0, 0, dx),
    vec4(0, 1.0, 0, dy),
    vec4(0, 0, 1.0, dz),
    vec4(0, 0, 0, 1.0) );
}

vec4 lorentzNormalize(vec4 v)
{
  return v/length(v);
}

float lorentzDot(vec4 u, vec4 v)
{
  return dot(u,v);
}

float hypDistance(vec4 u, vec4 v)
{
  return distance( u, v );
}

vec4 projectToKlein(vec4 v)
{
  v.w = 1.0;
  return v;
}

vec4 directionFrom2Points(vec4 u, vec4 v)
{
  vec4 w = v + dot(u, v)*u;
  return (1.0/length(w)*w);
}

vec4 pointOnGeodesic(vec4 u, vec4 vPrime, float dist)
{ 
  // get point at distance dist on the geodesic from u through v
  // ZZZ - Not worked out yet.
  return u*(dist) + vPrime*(dist);
}

vec4 tangentVectorOnGeodesic(vec4 u, vec4 vPrime, float dist)
{
  // note that this point has lorentzDot with itself of -1, so it is on other hyperboloid
  // ZZZ - Not worked out yet.
  return u*(dist) + vPrime*(dist);
}

vec4 pointOnGeodesicAtInfinity(vec4 u, vec4 vPrime)
{ 
  // I'm not yet sure what we should be doing here.
  return projectToKlein(u + vPrime);
}

float sphereHSDF(vec4 samplePoint, vec4 center, float radius)
{
  return distance(samplePoint, center) - radius;
}

float geodesicPlaneHSDF(vec4 samplePoint, vec4 dualPoint, float offset)
{
  return sphereHSDF(samplePoint, dualPoint, radius);
}

// Need to remove this, but phong model code in fragment.glsl is using it.
float cosh(float x){
  float eX = exp(x);
  return (0.5 * (eX + 1.0/eX));
}

//
// Functions below this don't apply, but we need them included to make the shader compile.
//

float horosphereHSDF(vec4 samplePoint, vec4 lightPoint, float offset)
{
  return 0.0;
}