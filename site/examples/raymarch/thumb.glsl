mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float map(vec3 p){p.xz*=rot(u_time*.35);p.yz*=rot(u_time*.25);float b=length(p)-1.+.15*sin(p.x*4.+u_time*1.6)*sin(p.y*4.+u_time*1.2)*sin(p.z*4.+u_time);float r=length(vec2(length(p.xz)-1.6,p.y))-.05;return min(b*.6,r);}
void mainImage(out vec4 o,in vec2 fc){vec2 uv=(fc-.5*u_resolution)/u_resolution.y;vec3 ro=vec3(0,0,4.2),rd=normalize(vec3(uv,-1.6));float d=0.,g=0.;bool hit=false;
for(int i=0;i<70;i++){float h=map(ro+rd*d);g+=exp(-h*12.)*.02;if(h<.002){hit=true;break;}d+=h;if(d>10.)break;}
vec3 col=mix(vec3(.02,.01,.05),vec3(.12,.05,.25),1.-smoothstep(0.,1.2,length(uv)))+g*vec3(.5,.35,1.)*.5;
if(hit){vec3 p=ro+rd*d;vec2 e=vec2(.002,0);vec3 n=normalize(vec3(map(p+e.xyy)-map(p-e.xyy),map(p+e.yxy)-map(p-e.yxy),map(p+e.yyx)-map(p-e.yyx)));
vec3 l=normalize(vec3(.6,.8,.5));float fr=pow(1.-max(dot(n,-rd),0.),3.);vec3 base=.5+.5*cos(6.2831*(dot(n,vec3(.4,.7,.2))*.6+u_time*.08+vec3(0,.33,.67)));
col=base*(.15+.6*max(dot(n,l),0.))+vec3(.7,.5,1.)*fr*1.1+pow(max(dot(reflect(rd,n),l),0.),40.);}
o=vec4(pow(col,vec3(.85)),1.);}
