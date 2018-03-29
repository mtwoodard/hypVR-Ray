//Raymarch Primitives
float sphereHSDF(vec4 samplePoint, vec4 center, float radius){
  return hypDistance(samplePoint, center) - radius;
}

// A horosphere can be constructed by offseting from a standard horosphere.
// Our standard horosphere will have a center in the direction of lightPoint
// and go through the origin. Negative offsets will "shrink" it.
float horosphereHSDF(vec4 samplePoint, vec4 lightPoint, float offset){
  return log(lorentzDot(samplePoint, lightPoint)) - offset;
}

float geodesicPlaneHSDF(vec4 samplePoint, vec4 dualPoint, float offset){
  return asinh(lorentzDot(samplePoint, dualPoint)) - offset;
}

float geodesicCylinderHSDFplanes(vec4 samplePoint, vec4 dualPoint1, vec4 dualPoint2, float radius){
  // defined by two perpendicular geodesic planes
  float dot1 = lorentzDot(samplePoint, dualPoint1);
  float dot2 = lorentzDot(samplePoint, dualPoint2);
  return asinh(sqrt(dot1*dot1 + dot2*dot2)) - radius;
}

float geodesicCylinderHSDFends(vec4 samplePoint, vec4 lightPoint1, vec4 lightPoint2, float radius){
  // defined by two light points (at ends of the geodesic) whose lorentzDot is 1
  return acosh(sqrt(2.0*lorentzDot(lightPoint1, samplePoint)*lorentzDot(lightPoint2, samplePoint))) - radius;
}


float localSceneHSDF(vec4 samplePoint){
  if(sceneIndex == 1){  // sphere and horosphere
     float sphere = sphereHSDF(samplePoint, ORIGIN, sphereRad);
     float horosphere = horosphereHSDF(abs(samplePoint), idealCubeCornerKlein, horosphereSize);
     float final = -unionSDF(horosphere, sphere);
     return final;
  }
  else if(sceneIndex == 2){  // sphere and plane
   float sphere = sphereHSDF(samplePoint, ORIGIN, sphereRad);
   vec4 dualPoint = lorentzNormalize(vec4(halfCubeWidthKlein,halfCubeWidthKlein,halfCubeWidthKlein,1.0));
   float plane0 = geodesicPlaneHSDF(abs(samplePoint), dualPoint, planeOffset);
   float final = -unionSDF(plane0, sphere);
   return final;
  }
  else if(sceneIndex == 3){  // edge medial surfaces
    samplePoint = abs(samplePoint);
    // //now reflect until smallest xyz coord is z, and largest is x
    if(samplePoint.x < samplePoint.z){
      samplePoint = vec4(samplePoint.z,samplePoint.y,samplePoint.x,samplePoint.w);
    }
    if(samplePoint.y < samplePoint.z){
      samplePoint = vec4(samplePoint.x,samplePoint.z,samplePoint.y,samplePoint.w);
    }
    if(samplePoint.x < samplePoint.y){
      samplePoint = vec4(samplePoint.y,samplePoint.x,samplePoint.z,samplePoint.w);
    }
    // should precompute these orthonomal calculations
    vec4 dualPoint1 = lorentzNormalize(vec4(1.0/halfCubeWidthKlein,0.0,0.0,1.0));
    vec4 dualPoint2 = vec4(0.0,1.0/halfCubeWidthKlein,0.0,1.0);
    dualPoint2 = lorentzNormalize(dualPoint2 + lorentzDot(dualPoint2, dualPoint1) * dualPoint1);
    float edgesDistance = geodesicCylinderHSDFplanes(samplePoint, dualPoint1, dualPoint2, 0.0);
    // the following two ways to define the geodesic should give the same result
    // vec4 dualPoint1 = vec4(0.0,1.0,0.0,0.0);
    // vec4 dualPoint2 = vec4(0.0,0.0,1.0,0.0);
    // float final = -geodesicCylinderHSDFplanes(samplePoint, dualPoint1, dualPoint2, 0.6);

    vec4 lightPoint1 = (1.0/sqrt(2.0))*vec4(1.0,0.0,0.0,1.0);
    vec4 lightPoint2 = (1.0/sqrt(2.0))*vec4(-1.0,0.0,0.0,1.0);
    float dualEdgesDistance = geodesicCylinderHSDFends(samplePoint, lightPoint1, lightPoint2, 0.0);

    float final = 0.5*edgesDistance - 0.5*dualEdgesDistance;
    return final;
  }
  else if(sceneIndex  == 4){  // cube sides
    /// draw sides of the cube fundamental domain
    vec4 dualPoint0 = lorentzNormalize(vec4(1.0/halfCubeWidthKlein,0.0,0.0,1.0));
    vec4 dualPoint1 = lorentzNormalize(vec4(0.0,1.0/halfCubeWidthKlein,0.0,1.0));
    vec4 dualPoint2 = lorentzNormalize(vec4(0.0,0.0,1.0/halfCubeWidthKlein,1.0));
    float plane0 = geodesicPlaneHSDF(abs(samplePoint), dualPoint0, 0.0);
    float plane1 = geodesicPlaneHSDF(abs(samplePoint), dualPoint1, 0.0);
    float plane2 = geodesicPlaneHSDF(abs(samplePoint), dualPoint2, 0.0);
    float final = unionSDF(unionSDF(plane0,plane1),plane2);
    return final;
  }
}

float globalSceneHSDF(vec4 samplePoint){
  vec4 absoluteSamplePoint = samplePoint * cellBoost; // correct for the fact that we have been moving
  return sphereHSDF(absoluteSamplePoint, lightSourcePosition, 0.1);
}
