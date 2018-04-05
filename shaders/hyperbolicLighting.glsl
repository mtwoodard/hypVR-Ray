//COLORING FUNCTIONS ++++++++++++++++++++++++++++++++++++++++++++++++++++
vec4 localEstimateNormal(vec4 p) { // normal vector is in tangent plane to hyperboloid at p
    // float denom = sqrt(1.0 + p.x*p.x + p.y*p.y + p.z*p.z);  // first, find basis for that tangent hyperplane
    vec4 basis_x = lorentzNormalize(vec4(p.w,0.0,0.0,p.x));  // dw/dx = x/w on hyperboloid
    vec4 basis_y = vec4(0.0,p.w,0.0,p.y);  // dw/dy = y/denom
    vec4 basis_z = vec4(0.0,0.0,p.w,p.z);  // dw/dz = z/denom  /// note that these are not orthonormal!
    basis_y = lorentzNormalize(basis_y - lorentzDot(basis_y, basis_x)*basis_x); // need to Gram Schmidt
    basis_z = lorentzNormalize(basis_z - lorentzDot(basis_z, basis_x)*basis_x - lorentzDot(basis_z, basis_y)*basis_y);
    // float HSDFp = localSceneHSDF(p);
   return lorentzNormalize(
       // basis_x * (localSceneHSDF(lorentzNormalize(p + 2.0*EPSILON*basis_x)) - HSDFp) +
       // basis_y * (localSceneHSDF(lorentzNormalize(p + 2.0*EPSILON*basis_y)) - HSDFp) +
       // basis_z * (localSceneHSDF(lorentzNormalize(p + 2.0*EPSILON*basis_z)) - HSDFp)
       basis_x * (localSceneHSDF(lorentzNormalize(p + EPSILON*basis_x)) - localSceneHSDF(lorentzNormalize(p - EPSILON*basis_x))) +
       basis_y * (localSceneHSDF(lorentzNormalize(p + EPSILON*basis_y)) - localSceneHSDF(lorentzNormalize(p - EPSILON*basis_y))) +
       basis_z * (localSceneHSDF(lorentzNormalize(p + EPSILON*basis_z)) - localSceneHSDF(lorentzNormalize(p - EPSILON*basis_z)))
   );
  }

vec4 globalEstimateNormal(vec4 p) { // normal vector is in tangent plane to hyperboloid at p
    // float denom = sqrt(1.0 + p.x*p.x + p.y*p.y + p.z*p.z);  // first, find basis for that tangent hyperplane
    vec4 basis_x = lorentzNormalize(vec4(p.w,0.0,0.0,p.x));  // dw/dx = x/w on hyperboloid
    vec4 basis_y = vec4(0.0,p.w,0.0,p.y);  // dw/dy = y/denom
    vec4 basis_z = vec4(0.0,0.0,p.w,p.z);  // dw/dz = z/denom  /// note that these are not orthonormal!
    basis_y = lorentzNormalize(basis_y - lorentzDot(basis_y, basis_x)*basis_x); // need to Gram Schmidt
    basis_z = lorentzNormalize(basis_z - lorentzDot(basis_z, basis_x)*basis_x - lorentzDot(basis_z, basis_y)*basis_y);
    // float HSDFp = globalSceneHSDF(p);
   return lorentzNormalize(
       // basis_x * (globalSceneHSDF(lorentzNormalize(p + 2.0*EPSILON*basis_x)) - HSDFp) +
       // basis_y * (globalSceneHSDF(lorentzNormalize(p + 2.0*EPSILON*basis_y)) - HSDFp) +
       // basis_z * (globalSceneHSDF(lorentzNormalize(p + 2.0*EPSILON*basis_z)) - HSDFp)
       basis_x * (globalSceneHSDF(lorentzNormalize(p + EPSILON*basis_x)) - globalSceneHSDF(lorentzNormalize(p - EPSILON*basis_x))) +
       basis_y * (globalSceneHSDF(lorentzNormalize(p + EPSILON*basis_y)) - globalSceneHSDF(lorentzNormalize(p - EPSILON*basis_y))) +
       basis_z * (globalSceneHSDF(lorentzNormalize(p + EPSILON*basis_z)) - globalSceneHSDF(lorentzNormalize(p - EPSILON*basis_z)))
   );
}
