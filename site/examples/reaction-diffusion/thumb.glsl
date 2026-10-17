float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void mainImage(out vec4 o,in vec2 fc){vec2 uv=fc/u_resolution;vec2 p=uv*vec2(u_aspect,1.)*9.;
vec2 i=floor(p),f=fract(p);float d=1.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 g=vec2(x,y);vec2 c=g+.5+.35*sin(u_time*.6+6.2831*vec2(h(i+g),h(i+g+7.)));d=min(d,length(f-c));}
float v=smoothstep(.42,.3,d);vec3 base=.5+.5*cos(6.2831*(.55+.4*uv.x-.2*uv.y+u_time*.03+vec3(0,.33,.67)));
o=vec4(mix(vec3(.015,.01,.04),base,v)*(.6+.5*smoothstep(.45,.0,d)),1.);}
