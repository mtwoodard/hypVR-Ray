float localSceneHSDF(vec4 samplePoint){
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
    //vec4 dualPoint2 = vec4(0.0,1.0/halfCubeWidthKlein,0.0,1.0);
    vec4 dualPoint1 = lorentzNormalize(halfCubeDualPoints[1] - lorentzDot(halfCubeDualPoints[1], halfCubeDualPoints[0]) * halfCubeDualPoints[0]);
    float edgesDistance = geodesicCylinderHSDFplanes(samplePoint, halfCubeDualPoints[0], dualPoint1, 0.0);

    vec4 lightPoint1 = (1.0/sqrt(2.0))*vec4(1.0,0.0,0.0,1.0);
    vec4 lightPoint2 = (1.0/sqrt(2.0))*vec4(-1.0,0.0,0.0,1.0);
    float dualEdgesDistance = geodesicCylinderHSDFends(samplePoint, lightPoint1, lightPoint2, 0.0);

    float final = 0.5*edgesDistance - 0.5*dualEdgesDistance;
    return final;
}