float w(vec2 uv,vec2 p){return 1./(dot(uv-p,uv-p)+.02);}
void mainImage(out vec4 o,in vec2 fc){vec2 uv=(fc-.5*u_resolution)/u_resolution.y*1.2;float t=u_time*.35;
float a=sin(t*.7)*1.5*exp(-dot(uv,uv)*.8);uv*=mat2(cos(a),-sin(a),sin(a),cos(a));
float w1=w(uv,vec2(sin(t*1.1),cos(t*.9))*.6),w2=w(uv,vec2(cos(t*.7+2.),sin(t*1.3+1.))*.6),w3=w(uv,vec2(sin(t*.8+4.),cos(t*1.2+3.))*.6),w4=w(uv,vec2(cos(t*1.4+5.),sin(t*.6+2.))*.6);
vec3 c=(vec3(.10,.05,.35)*w1+vec3(.49,.36,1.)*w2+vec3(.13,.83,.93)*w3+vec3(1.,.31,.85)*w4)/(w1+w2+w3+w4);o=vec4(c,1.);}
