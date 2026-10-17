float b2(vec2 a){a=floor(a);return fract(a.x/2.+a.y*a.y*.75);}
void mainImage(out vec4 o,in vec2 fc){float px=3.;vec2 cell=floor(fc/px);vec2 uv=((cell+.5)*px-.5*u_resolution)/u_resolution.y;float hz=-.08;
vec3 col=mix(vec3(.9,.2,.55),vec3(.04,.01,.12),smoothstep(hz,.55,uv.y));vec2 s=uv-vec2(0,.14);float sun=1.-smoothstep(.27,.275,length(s));
sun*=step(0.,sin(s.y*110.+u_time*2.)+.7+s.y*4.);col=mix(col,mix(vec3(1.,.2,.55),vec3(1.,.85,.25),smoothstep(-.25,.25,s.y)),sun);
float dp=hz-uv.y;if(dp>0.){float z=.35/dp;vec2 g=abs(fract(vec2(uv.x*z,z+u_time*2.))-.5);col=vec3(.03,0.,.08)+vec3(.2,.9,1.)*(1.-smoothstep(0.,.06,min(g.x,g.y)))*exp(-z*.08)*1.5;}
float bay=b2(.5*cell)*.25+b2(cell);o=vec4(floor(col*2.+bay)/2.,1.);}
