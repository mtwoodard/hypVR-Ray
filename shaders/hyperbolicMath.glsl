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
  // the "direction" (velocity vector) vPrime for use in parametrising the geodesic from u through v
  vec4 w = v + lorentzDot(u, v)*u;
  return (1.0/hypNorm(w)*w);
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


bool isOutsideCell(vec4 samplePoint, out mat4 fixMatrix){
  vec4 kleinSamplePoint = projectToKlein(samplePoint);
  if(kleinSamplePoint.x > halfCubeWidthKlein){
    fixMatrix = invGenerators[0];
    return true;
  }
  if(kleinSamplePoint.x < -halfCubeWidthKlein){
    fixMatrix = invGenerators[1];
    return true;
  }
  if(kleinSamplePoint.y > halfCubeWidthKlein){
    fixMatrix = invGenerators[2];
    return true;
  }
  if(kleinSamplePoint.y < -halfCubeWidthKlein){
    fixMatrix = invGenerators[3];
    return true;
  }
  if(kleinSamplePoint.z > halfCubeWidthKlein){
    fixMatrix = invGenerators[4];
    return true;
  }
  if(kleinSamplePoint.z < -halfCubeWidthKlein){
    fixMatrix = invGenerators[5];
    return true;
  }
  return false;
}
