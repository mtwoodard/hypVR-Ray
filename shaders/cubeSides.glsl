float localSceneSDF(vec4 samplePoint){
    /// draw sides of the cube fundamental domain
    float plane0 = geodesicPlaneHSDF(abs(samplePoint), halfCubeDualPoints[0], 0.0);
    float plane1 = geodesicPlaneHSDF(abs(samplePoint), halfCubeDualPoints[1], 0.0);
    float plane2 = geodesicPlaneHSDF(abs(samplePoint), halfCubeDualPoints[2], 0.0);
    float final = unionSDF(unionSDF(plane0,plane1),plane2);
    return final;
}