void mainImage(out vec4 o,in vec2 fc){vec2 uv=(fc-.5*u_resolution)/u_resolution.y;float t=u_time*.6,asp=u_aspect,f=0.;vec2 gr=vec2(0);
for(int i=0;i<8;i++){float k=float(i);vec2 p=vec2(sin(t*(.5+k*.07)+k*2.1)*asp*.38,cos(t*(.6+k*.05)+k*1.3)*.32);float g=exp(-dot(uv-p,uv-p)/.02);f+=g;gr-=2.*(uv-p)/.02*g;}
vec3 n=normalize(vec3(-gr*.15,1));vec3 L=normalize(vec3(-.5,.6,.7));float df=max(dot(n,L),0.),sp=pow(max(dot(reflect(-L,n),vec3(0,0,1)),0.),60.);
vec3 b=(.5+.5*cos(6.2831*(.62+(1.-n.z)*.9+uv.x*.15+t*.05+vec3(0,.33,.67))))*(.25+.8*df)+sp*1.2;vec3 bg=vec3(.02,.02,.05)+vec3(.45,.3,1.)*.25*min(f,1.);
o=vec4(mix(bg,b,smoothstep(.48,.52,f)),1.);}
