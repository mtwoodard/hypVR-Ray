# hypVR-Ray
Hyperbolic VR using Raymarching.

![alt text](https://raw.githubusercontent.com/mtwoodard/hypVR-Ray/master/images/437_screenshot.PNG)

Based on the websperience  by Vi Hart, Andrea Hawksley, Sabetta Matsumoto and Henry Segerman featured over at https://github.com/hawksley/hypVR. This project seeks to improve upon the original by using raymarching as a technique to improve the visible depth of the environment. HypVR-Ray is being worked by Michael Woodard, Henry Segerman, and Roice Nelson and is helped by the work of Jeff Week's Curved Spaces, Mozilla's webVR framework for THREEjs, and Jamie Wong's Ray Marching and Signed Distance Functions.

This material is based upon work supported by the National Science Foundation under Grant No. DMS-1708239. Any opinions, findings, and conclusions or recommendations expressed in this material are those of the author(s) and do not necessarily reflect the views of the National Science Foundation.

Check out this project at www.michaelwoodard.net/hypVR-Ray/ 

# Links
* http://michaelwoodard.net
* http://segerman.org/
* http://vihart.com
* http://andreahawksley.com
* http://www.geometrygames.org/CurvedSpaces/
* https://github.com/MozVR/vr-web-examples/tree/master/threejs-vr-boilerplate
* http://jamie-wong.com/2016/07/15/ray-marching-signed-distance-functions/


# Running Locally
Running this locally requires a simple web server (to source the shader files at runtime), with the root at the same level as index.html. This can be done in python 3 by running the command "python -m http.server". On Windows, you can set up a server in the Control Panel Administrative Tools, in the IIS Manager (you may need to turn this feature on first). NOTE: The server will need to have a MIME type configuration for .glsl files set to "text/plain".

# Controls
Use arrow keys to move and "wasd" to rotate the camera. "q" and "e" roll the camera. To enter VR mode press "v", "enter", or "space".

# Related work
* Vi Hart, Andrea Hawksley, Elisabetta A. Matsumoto, and Henry Segerman. Non-euclidean virtual reality II: explorations of H3. In Proc. Bridges 2017, pages 33-40. Tessellations Publishing, 2017.
* Vi Hart, Andrea Hawksley, Elisabetta A. Matsumoto, and Henry Segerman. Non-euclidean virtual reality II: explorations of H2 × E. In Proc. Bridges 2017, pages 41-48. Tessellations Publishing, 2017.
* Vi Hart, Andrea Hawksley, Henry Segerman, and Marc ten Bosch. Hypernom: Mapping VR headset orientation to S3. In Proc. Bridges 2015, pages 387–390. Tessellations Publishing, 2015.
* Jeff Weeks. Curved Spaces. a flight simulator for multiconnected universes, available from http://www. geometrygames.org/CurvedSpaces/.
* Jeff Weeks. Real-time rendering in curved spaces. IEEE Computer Graphics and Applications, 22(6):90–99, 2002.
* Charles Gunn, Discrete groups and visualization of three-dimensional manifolds, Proceedings of the 20th annual conference on computer graphics and interactive techniques, 1993, pp. 255–262.
* Charles Gunn, Advances in metric-neutral visualization, Proceedings of gravisma 2010, 2010, pp. 17–26.
* The Geometry Center, Not Knot, http://www.geom.uiuc.edu/video/NotKnot/
