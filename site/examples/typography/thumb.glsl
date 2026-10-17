float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float n(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+1.),u.x),u.y);}
float fb(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p=p*2.02+1.7;a*=.5;}return v;}
float box(vec2 p,vec2 b){vec2 q=abs(p)-b;return length(max(q,0.))+min(max(q.x,q.y),0.);}
void mainImage(out vec4 o,in vec2 fc){vec2 uv=(fc-.5*u_resolution)/u_resolution.y;float t=u_time*.2;vec2 w=uv+.6*vec2(fb(uv*2.+t),fb(uv*2.-t+5.));
float b=sin((w.x+w.y)*9.+fb(w*3.)*6.-u_time);vec3 c=.5+.5*cos(6.2831*(.5+.25*b+.3*w.x+t*.3+vec3(0,.33,.67)));c*=.7+.5*smoothstep(.6,1.,b);c+=pow(max(b,0.),20.)*.8;
float x=uv.x*4.;float cell=fract(x)-.5;float row=abs(uv.y)<.26?1.:0.;float glyph=step(box(vec2(cell*.25,uv.y-.0),vec2(.09,.24)),0.)*row*step(abs(uv.x),.8);
glyph*=1.-step(.75,h(vec2(floor(x),1.)))*step(abs(uv.y),.08);o=vec4(mix(vec3(.02,.015,.05),c,glyph),1.);}
