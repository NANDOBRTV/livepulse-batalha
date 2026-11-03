#!/usr/bin/env python3
"""Original independent fantasy sprites for LivePulse V12.9 (no flattened HUD)."""
from pathlib import Path
import math,random,io,sys,colorsys
import cairosvg
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
OUT=Path('/mnt/data/v129_work/art');OUT.mkdir(parents=True,exist_ok=True)
S=math.sin;C=math.cos;PI=math.pi

def svg_start(w,h,colors):
 p,c,light,shadow=colors
 return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">
 <defs>
 <linearGradient id="wing" x1="0" y1="0" x2="1" y2="1"><stop stop-color="{shadow}"/><stop offset=".42" stop-color="{p}"/><stop offset=".73" stop-color="{shadow}"/><stop offset="1" stop-color="#080718"/></linearGradient>
 <linearGradient id="metal" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#f3debe"/><stop offset=".09" stop-color="{light}"/><stop offset=".22" stop-color="#42405d"/><stop offset=".45" stop-color="#090f23"/><stop offset=".75" stop-color="{p}"/><stop offset="1" stop-color="#090b15"/></linearGradient>
 <linearGradient id="armor" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#d9e4f2"/><stop offset=".09" stop-color="#5d6178"/><stop offset=".26" stop-color="#16172a"/><stop offset=".63" stop-color="#29233b"/><stop offset=".85" stop-color="{p}"/><stop offset="1" stop-color="#120b20"/></linearGradient>
 <radialGradient id="ember"><stop stop-color="#fffde4"/><stop offset=".16" stop-color="{light}"/><stop offset=".37" stop-color="{p}"/><stop offset=".82" stop-color="{shadow}" stop-opacity=".65"/><stop offset="1" stop-color="{p}" stop-opacity="0"/></radialGradient>
 <radialGradient id="eye"><stop stop-color="#fff"/><stop offset=".28" stop-color="{light}"/><stop offset=".52" stop-color="{p}"/><stop offset="1" stop-color="{p}" stop-opacity="0"/></radialGradient>
 <linearGradient id="horn" x1=".1" y1="0" x2=".9" y2="1"><stop stop-color="#ffefc0"/><stop offset=".18" stop-color="#9a9ca7"/><stop offset=".56" stop-color="#3d4050"/><stop offset="1" stop-color="#080a16"/></linearGradient>
 <linearGradient id="crystal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="white"/><stop offset=".13" stop-color="{light}"/><stop offset=".44" stop-color="{p}"/><stop offset="1" stop-color="#08182c"/></linearGradient>
 </defs>'''

def path(d,fill,stroke='#1b1528',sw=2,other=''):
 return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round" stroke-linecap="round" {other}/>'
def poly(points,fill,stroke='#181526',sw=2,other=''):
 return f'<polygon points="{points}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round" {other}/>'
def line(points,stroke,sw=2,opacity=1):
 return f'<polyline points="{points}" fill="none" stroke="{stroke}" stroke-width="{sw}" opacity="{opacity}" stroke-linecap="round" stroke-linejoin="round"/>'
def ellipse(x,y,rx,ry,fill,opacity=1):
 return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{fill}" opacity="{opacity}"/>'
def circle(x,y,r,fill,opacity=1):return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" opacity="{opacity}"/>'
def png(svg,filename,scale=1):
 try:
  b=cairosvg.svg2png(bytestring=svg.encode(),output_width=None,output_height=None)
  # CairoSVG outputs RGBA; optimize to reduce download size.
  image=Image.open(io.BytesIO(b)).convert('RGBA')
  image.save(OUT/filename,optimize=True,compress_level=7)
 except Exception as e:
  raise RuntimeError(f'{filename}: {e}')

fire=('#ff5020','#a92716','#fff2a1','#3a0722')
ice=('#17bbff','#0a5bce','#e1ffff','#092254')
boss_colors=[('#c34cff','#6a25bd','#fceaff','#271344'),('#ff9d31','#d44423','#ffecd0','#5a1620'),('#ff2e56','#b81443','#ffdf99','#490c29')]

def dragon(team,action,frame):
 cols=fire if team=='chat' else ice
 p,_,light,shadow=cols
 t=frame*PI/4;roar=action=='roar';attack=action=='attack';hurt=action=='hurt'
 gape=19 if roar else 15 if attack else 8+2*S(t) if not hurt else 4
 wings=16*S(t+.5)
 gl=svg_start(520,320,cols)
 # Face towards interior; creator team facing left via shared mirrored group.
 if team=='creator':gl+='<g transform="translate(520,0) scale(-1,1)">'
 gl+=ellipse(280,184,210,135,'url(#ember)',.42)
 # Sweeping wing backdrop and ornamented struts
 gl+=path(f'M 169 205 Q 102 {117+wings:.1f} 56 25 Q 106 41 152 78 Q 98 6 117 1 Q 210 58 240 133 L 252 245 Z','url(#wing)',p,5)
 for j in range(7):
  x=72+j*21;y=34+(j%3)*23
  gl+=line(f'195,217 {x},{y}',light if j%2==0 else p,2,.40)
 # Heavy curving neck, jaw and back scales
 gl+=path('M 24 273 C 38 196 83 143 159 143 C 195 128 204 106 251 101 L 335 148 L 345 211 C 253 201 221 244 193 307 L 24 316 Z','url(#armor)',p,5)
 gl+=path('M 47 279 C 99 221 174 205 255 207 L 210 295 L 38 316 Z','url(#wing)',light,3)
 # overlapping armor scales along neck
 for r in range(5):
  for j in range(8-r):
   x=68+j*24 + r*10;y=266-r*25+j*2
   ang=3 if j%2 else -2
   pts=f'{x-13},{y-4} {x+1},{y-20} {x+15},{y-5} {x+5},{y+11} {x-7},{y+9}'
   gl+=poly(pts,'url(#metal)' if j%3==0 else 'url(#armor)',p if r%2 else '#9c7d68',.9,other=f'opacity="{.82 if r==0 else .9}"')
   gl+=line(f'{x-7},{y-2} {x},{y-13} {x+8},{y-4}',light,1.0,.60)
 # layered bony spikes along mane, two staggered rows
 for j in range(13):
  x=112+j*16;y=154-int(39*S(j/13*PI))
  h=25+(j%4)*11
  gl+=poly(f'{x-10},{y+7} {x-8},{y-h} {x+8},{y-5} {x+17},{y+12}', 'url(#horn)',shadow,2)
  gl+=line(f'{x-8},{y+4} {x-7},{y-h+7}',light,1.5,.75)
 # Horns – recurved, layered
 gl+=path('M 259 126 Q 226 51 176 9 Q 214 23 270 69 Q 251 15 246 0 Q 302 39 306 112 Z','url(#horn)',shadow,4)
 gl+=path('M 299 104 Q 320 38 351 12 Q 337 75 330 133 Z','url(#horn)',shadow,3)
 # Dragon brow, snout and jaw
 gl+=path('M 237 110 C 276 78 331 88 376 112 L 427 119 Q 470 126 484 160 L 452 178 Q 405 174 382 169 L 358 188 L 277 170 Z','url(#metal)',shadow,6)
 gl+=path('M 284 122 L 332 98 L 381 123 L 427 143 L 479 151 L 447 162 L 375 155 L 344 169 L 298 155 Z','url(#armor)',p,3)
 # nostril, ridge spikes
 gl+=ellipse(451,148,5,3,'#03030b')
 for j in range(5):
  x=315+j*25;y=109+j*8
  gl+=poly(f'{x-9},{y+5} {x},{y-13-j*2} {x+11},{y+8}', 'url(#horn)',p,2)
 # open black mouth and teeth
 gl+=path(f'M 348 172 Q 411 160 471 166 Q 455 {190+gape:.1f} 416 {209+gape:.1f} Q 375 {216+gape:.1f} 352 193 Z','#070415',p,3)
 gl+=path(f'M 355 {190+gape:.1f} Q 404 {200+gape:.1f} 452 {186+gape:.1f} L 413 {214+gape:.1f} L 365 {203+gape:.1f} Z','url(#armor)',light,2)
 for j in range(10):
  x=358+j*11.5;y=173-j*.7
  gl+=poly(f'{x:.1f},{y:.1f} {x+5:.1f},{y+12+(j%3)*3:.1f} {x+9:.1f},{y-2:.1f}', '#fff8df','#9d916f',.7)
  gl+=poly(f'{x+2:.1f},{208+gape-j*.4:.1f} {x+5:.1f},{197+gape-j*.4:.1f} {x+9:.1f},{208+gape-j*.4:.1f}', '#e9f8fb','#a2a0a0',.5)
 # eyes, eyebrows, glow
 gl+=ellipse(328,138,35,23,'url(#eye)',.7)
 gl+=path('M 294 132 L 345 126 L 324 149 L 308 147 Z',light,'#100d12',2)
 gl+=poly('321,135 327,137 322,150 317,148','#0b0b17','none',0)
 gl+=line('295,125 323,114 349,122',light,3,.9)
 # whiskers
 for q in range(3):
  gl+=path(f'M 394 {164+q*4} Q {437+q*2} {211+q*12} {504-q*13} {192+q*17}', 'none',light,1.1,other='opacity=".55"')
 # subtle ember spikes along body
 rnd=random.Random(101+frame)
 for i in range(15):
  x=rnd.randrange(50,480);y=rnd.randrange(25,300)
  gl+=circle(x,y,rnd.choice([.7,1.1,2.1]),light,rnd.random()*.6)
 if attack:
  for j in range(8):
   x=482+j*6;y=169+S(t+j)*10
   gl+=path(f'M {x} {y} Q {x+16} {y-9-j*2} {x+30} {y+3} Q {x+10} {y+7} {x} {y+4} Z',p,light,1,other='opacity=".8"')
 if hurt:
  gl+=path('M 238 100 L 259 67 L 246 118 L 276 92 L 260 140','none',light,4)
 if team=='creator':gl+='</g>'
 return gl+'</svg>'

# Boss wings are independent geometric shapes within each transparent animation frame.
def boss(phase,action,frame):
 cols=boss_colors[phase-1];p,base,light,shadow=cols
 t=frame*PI/4
 flap=14*S(t);dodge=8*S(t+PI/3) if action=='hurt' else 0
 attack=action=='attack';defeat=action=='defeat';summon=action=='summon'
 g=svg_start(600,440,cols)
 g+=ellipse(300,213,254,205,'url(#ember)',.34 if not defeat else .16)
 if summon:g+=circle(300,220,165,'url(#ember)',.45)
 # Wings – giant bat membranes left and right; curves animate independently.
 for flip in [False,True]:
  g+= '<g transform="translate(600,0) scale(-1,1)">' if flip else '<g>'
  g+=path(f'M 269 204 Q 175 {72-flap:.1f} 99 {35-flap:.1f} Q 91 {108-flap:.1f} 66 137 Q 25 92 16 141 Q 63 190 17 {274+flap:.1f} Q 117 261 151 298 Q 169 257 223 267 L 281 223 Z','url(#wing)',p,6)
  g+=path(f'M 263 205 Q 165 118 107 {66-flap:.1f} M 237 236 Q 105 170 38 147 M 219 260 Q 119 244 35 268','none',light,2.5,other='opacity=".72"')
  g+=path(f'M 104 65 L 95 34 L 115 57 M 40 145 L 19 131 L 43 161 M 38 269 L 12 285 L 61 279','none','url(#horn)',4)
  for j in range(6):
   xx=45+j*29;yy=148+j*12
   g+=path(f'M {xx} {yy} Q {xx+10} {yy-15} {xx+15} {yy-6}', 'none',light,.9,other='opacity=".45"')
  g+='</g>'
 # horns both raised high
 g+=path('M 266 145 Q 207 115 197 66 Q 190 29 161 14 Q 227 40 230 92 Q 244 70 222 35 Q 280 75 281 129 Z','url(#horn)',shadow,5)
 g+=path('M 334 145 Q 393 115 403 66 Q 410 29 439 14 Q 373 40 370 92 Q 356 70 378 35 Q 320 75 319 129 Z','url(#horn)',shadow,5)
 # armored legs + spiked boots
 g+=path('M 251 330 L 230 417 L 285 424 L 308 350 Z','url(#armor)',p,4)
 g+=path('M 342 331 L 369 418 L 317 424 L 292 351 Z','url(#armor)',p,4)
 for x in [245,345]:
  g+=poly(f'{x-27},419 {x},390 {x+30},423 {x+14},433 {x-35},431','url(#metal)',light,2)
 # Massive torso metal armor
 g+=path('M 246 176 Q 298 154 358 180 L 401 314 L 348 367 L 248 367 L 197 312 Z','url(#armor)',p,6)
 g+=path('M 247 185 L 300 199 L 355 184 L 369 270 L 300 350 L 231 271 Z','url(#metal)',shadow,4)
 for j in range(7):
  yy=235+j*16;xx=236+j*3
  g+=poly(f'{xx},{yy} {296},{yy+16} {366-j*3},{yy} {352},{yy+13} {300},{yy+25} {249},{yy+12}','url(#armor)',light if j%2==0 else p,1.3)
 # left right arms dark metal and enormous hands
 for flip in [False,True]:
  g+='<g transform="translate(600,0) scale(-1,1)">' if flip else '<g>'
  turn=15 if attack else 0
  g+=path(f'M 247 207 Q 204 {197-turn} 170 230 L 122 {267-turn} L 151 {306-turn} Q 210 296 249 255 Z','url(#metal)',p,5)
  for j in range(5):
   x=175+j*13; y=223+j*8-turn*.6
   g+=poly(f'{x},{y} {x-14},{y-19} {x+9},{y-4} {x+18},{y+9}', 'url(#armor)',light,1)
  g+=path(f'M 129 {272-turn} Q 101 {272-turn} 82 {297-turn} L 94 {330-turn} L 134 {333-turn} L 159 {301-turn} Z','url(#metal)',p,4)
  for j in range(4):
   bx=95+j*14; yy=307-turn+(j%2)*5
   g+=poly(f'{bx},{yy} {bx-12},{yy+27} {bx+2},{yy+40} {bx+10},{yy+9}', 'url(#horn)',light,1.5)
  g+='</g>'
 # shoulder armor layered pauldrons
 for flip in [False,True]:
  g+='<g transform="translate(600,0) scale(-1,1)">' if flip else '<g>'
  g+=path('M 246 198 Q 218 173 188 190 L 163 219 Q 183 249 238 252 Z','url(#metal)',light,4)
  for j in range(4):
   xx=177+j*20
   g+=poly(f'{xx},{215+j*2} {xx-9},{179-j*5} {xx+22},{213+j*3}', 'url(#horn)',p,1.4)
  for j in range(3):
   g+=poly(f'{176+j*22},{230+j*3} {196+j*18},{222+j*4} {211+j*10},{235+j*3} {189+j*14},{241+j*5}','url(#armor)',light,1)
  g+='</g>'
 # Head, crown, cheeks
 g+=path('M 257 121 L 277 95 L 321 91 L 349 122 L 344 178 L 317 195 L 281 193 L 252 171 Z','url(#metal)',p,5)
 for j in range(7):
  x=252+j*16;h=[8,26,36,51,36,26,8][j]
  g+=poly(f'{x-8},136 {x}, {103-h} {x+11},136','url(#horn)',light,2)
 g+=path('M 256 143 L 287 139 L 299 160 L 281 170 L 258 162 Z','url(#armor)',light,2)
 g+=path('M 343 143 L 312 139 L 300 160 L 319 170 L 341 162 Z','url(#armor)',light,2)
 g+=ellipse(278,154,21,17,'url(#eye)',.8)
 g+=ellipse(324,154,21,17,'url(#eye)',.8)
 g+=poly('262,148 294,155 284,164 270,160',light,'#18091a',1)
 g+=poly('339,148 307,155 318,164 331,160',light,'#18091a',1)
 g+=path('M 279 177 L 300 184 L 319 177 L 310 194 L 300 199 L 291 194 Z','#140812',light,1.5)
 for j in range(7):
  x=284+j*5
  g+=poly(f'{x},181 {x+2},190 {x+4},181','#f9e5bd','none',0)
 # Pulsing chest crystal with gold ribs
 chest=1+.09*S(t)
 g+=ellipse(299,250,76*chest,90*chest,'url(#ember)',.5 if not defeat else .15)
 g+=poly('300,199 323,234 318,280 299,317 281,281 276,233', 'url(#crystal)',light,3)
 g+=poly('300,206 310,237 300,292 291,237', '#fff4c8','none',0,other='opacity=".52"')
 g+=line('247,225 266,254 277,230 300,201 322,230 336,255 353,225',light,3,.65)
 # edge scales and armor scratches
 for side in (0,1):
  for j in range(5):
   x=227+j*9;y=249+j*18
   if side:x=600-x
   g+=line(f'{x},{y} {x+(6 if not side else -6)},{y+10}',light,1.2,.65)
 rnd=random.Random(99+phase*13+frame)
 for i in range(22):
  x=rnd.randrange(52,555);y=rnd.randrange(46,415)
  g+=circle(x,y,rnd.choice([.7,1.3,2.5]),light,rnd.random()*.55)
 if attack:
  for flip in [False,True]:
   x=89 if not flip else 511
   g+=ellipse(x,299,46,42,'url(#ember)',.75)
   for j in range(7):
    angle=j*PI/3.5+t
    x2=x+40*C(angle);y2=299+35*S(angle)
    g+=line(f'{x:.1f},299 {x2:.1f},{y2:.1f}',light,3,.7)
 if action=='hurt':
  g+=path('M 201 137 L 246 171 L 224 204 L 267 222','none',light,4)
 if defeat:g+='<g opacity=".36">'+ellipse(300,197,130,180,'#070613',.7)+'</g>'
 return g+'</svg>'

def tower(team,state,frame):
 cols=fire if team=='chat' else ice
 p,_,light,shadow=cols
 t=frame*PI/4;broken=state in ('destroy','critical');shield=state=='shield'
 g=svg_start(400,470,cols)
 g+=ellipse(200,332,165,170,'url(#ember)',.36 if not broken else .65)
 # ground volcanic/icy foundation
 g+=path('M 48 422 L 351 422 L 382 459 L 14 459 Z','url(#metal)',light,5)
 for j in range(9):
  x=28+j*39
  g+=line(f'{x},450 {x+13},431',light,1.2,.5)
 # cylindrical tower cylinder with shaped sides
 g+=path('M 95 164 L 304 164 L 322 420 Q 200 451 78 420 Z','url(#armor)',light,5)
 g+=path('M 103 168 L 155 170 L 150 425 L 87 414 Z','#1c263a','none',0,other='opacity=".62"')
 g+=path('M 253 170 L 294 166 L 309 415 L 251 427 Z','#101c30','none',0,other='opacity=".65"')
 # brick courses and micro-cracks: masonry
 for row in range(11):
  y=188+row*22
  x0=93+(row%2)*22
  g+=line(f'94,{y} 307,{y+1}', '#e4d8c6',1.1,.43)
  for j in range(6):
   x=x0+j*39
   if x<304:
    g+=line(f'{x},{y} {x-1},{y+20}', '#b1a5a9',1.2,.31)
    if j%3==0:g+=line(f'{x+8},{y+9} {x+15},{y+6}',light,.8,.24)
 # turret parapet + battlements
 g+=path('M 62 148 L 337 148 L 324 208 L 75 208 Z','url(#metal)',light,6)
 g+=path('M 87 105 Q 197 75 312 105 L 326 153 Q 200 173 73 153 Z','url(#armor)',p,5)
 for j in range(7):
  x=73+j*39
  g+=path(f'M {x} 143 L {x+2} 90 L {x+28} 90 L {x+29} 146 Z','url(#metal)',light,3)
  # top battlement crenel
  g+=poly(f'{x+2},92 {x+15},68 {x+29},92','url(#horn)',p,2)
  g+=ellipse(x+16,96,19,29,'url(#ember)',.5)
  g+=poly(f'{x+14},73 {x+22},93 {x+15},113 {x+8},92','url(#crystal)',light,1.3)
 # red/blue vertical banners left and right, gold piping
 for flip in [False,True]:
  g+='<g transform="translate(400,0) scale(-1,1)">' if flip else '<g>'
  g+=path('M 85 195 Q 99 202 123 199 L 125 362 L 104 380 L 79 360 Z','url(#wing)',light,3)
  g+=line('85,207 121,209 122,360',light,2,.8)
  g+=poly('104,239 117,261 105,280 94,260','url(#crystal)',light,1)
  g+='</g>'
 # raised spire + crystal turret
 g+=path('M 166 93 L 198 33 L 233 94 Z','url(#metal)',light,4)
 g+=path('M 192 80 L 200 27 L 209 80 Z','url(#crystal)',light,2)
 g+=ellipse(202,50,48,52,'url(#ember)',.58)
 # central banner shield + lion-inspired crest as stylized relief
 g+=path('M 147 233 L 251 233 L 256 356 Q 200 397 144 353 Z','url(#metal)',light,5)
 g+=path('M 161 249 L 239 249 L 238 342 L 201 370 L 163 343 Z','url(#wing)',light,3)
 g+=path('M 181 290 Q 166 272 177 260 Q 181 252 200 258 Q 216 251 226 266 Q 232 282 220 293 L 220 329 Q 200 348 180 329 Z','url(#horn)',light,2)
 g+=path('M 183 280 L 191 276 L 196 290 L 184 291 M 218 280 L 210 276 L 205 290 L 216 291','none',shadow,3)
 g+=poly('192,311 201,300 210,312 201,327','url(#crystal)',light,1)
 # Additional filigree
 for j in range(5):
  x=125+j*37
  g+=poly(f'{x},157 {x+8},163 {x+17},157 {x+8},172','url(#horn)',p,.7)
 # Damage and shield vary as standalone action frames
 if shield:
  g+=ellipse(201,275,175+5*S(t),186+7*C(t),'none')
  g+=f'<ellipse cx="200" cy="277" rx="{174+5*S(t):.1f}" ry="{181+5*C(t):.1f}" fill="none" stroke="{light}" stroke-width="6" opacity=".70"/>'
  for j in range(9):
   angle=j*PI/4.5+t/6
   g+=poly(f'{200+180*C(angle):.1f},{275+185*S(angle):.1f} {200+174*C(angle+.14):.1f},{275+185*S(angle+.14):.1f} {200+185*C(angle+.2):.1f},{275+185*S(angle+.2):.1f}',light,'none',0)
 if state in ('hurt','critical','destroy'):
  g+=path('M 252 169 L 213 241 L 248 292 L 204 362','none',shadow,5)
  g+=path('M 254 168 L 217 241 L 246 293 L 207 362','none',light,2.5)
 if state=='destroy':
  g+=path('M 69 125 L 130 97 L 146 145 L 92 160 Z','url(#metal)',p,3)
  g+=ellipse(200,286,170,130,'url(#ember)',.4)
  for j in range(13):
   x=65+(j*23)%292; y=175+(j*37)%230
   g+=poly(f'{x},{y} {x+11},{y-17} {x+26},{y+6}', 'url(#horn)',light,1.5,other='opacity=".8"')
 if state=='rebuild':g+=ellipse(201,310,124,194,'url(#ember)',.6)
 return g+'</svg>'

# Atmospheric art backdrop: no scoreboard, no gifts, no UI, no characters.
def environment():
 W,H=900,1450
 arr=np.zeros((H,W,4),dtype=np.uint8)
 ys=np.arange(H)[:,None];xs=np.arange(W)[None,:]
 yy=ys/H;xx=xs/W
 seed=np.random.default_rng(129)
 noise=seed.normal(0,4,(H,W))
 d=np.abs(xx-.5)
 arr[:,:,0]=np.clip(8+18*(1-yy)+31*np.exp(-((yy-.37)/.23)**2)+28*(1-xx)*np.exp(-((yy-.60)/.2)**2)+noise,0,255)
 arr[:,:,1]=np.clip(6+8*(1-yy)+5*np.exp(-((yy-.31)/.22)**2)+20*xx*np.exp(-((yy-.65)/.28)**2)+noise,0,255)
 arr[:,:,2]=np.clip(27+42*(1-yy)+53*np.exp(-((yy-.45)/.34)**2)+23*xx*np.exp(-((yy-.65)/.30)**2)+noise,0,255)
 arr[:,:,3]=255
 img=Image.fromarray(arr,'RGBA');d=ImageDraw.Draw(img,'RGBA')
 # stars high atmosphere
 rnd=random.Random(129)
 for i in range(420):
  x=rnd.randrange(W);y=rnd.randrange(0,650);r=rnd.choice([1,1,1,2,3]);c=rnd.randrange(35,180)
  d.ellipse((x-r,y-r,x+r,y+r),fill=(205,188,255,c))
 # purple electrical clouds wide stage
 cloud=Image.new('RGBA',(W,H));cd=ImageDraw.Draw(cloud,'RGBA')
 for i in range(65):
  x=rnd.randrange(-100,W+80);y=rnd.randrange(150,850);rx=rnd.randrange(55,210);ry=rnd.randrange(25,90)
  cd.ellipse((x-rx,y-ry,x+rx,y+ry),fill=(118,36,168,rnd.randrange(7,28)))
 cloud=cloud.filter(ImageFilter.GaussianBlur(46));img=Image.alpha_composite(img,cloud);d=ImageDraw.Draw(img,'RGBA')
 # moon behind boss far offcenter
 glow=Image.new('RGBA',(W,H));gd=ImageDraw.Draw(glow,'RGBA')
 for r in range(190,40,-5):
  alpha=int(4.0*(190-r)/150)
  gd.ellipse((620-r,330-r,620+r,330+r),fill=(144,74,243,alpha))
 gd.ellipse((566,278,674,386),fill=(186,144,249,64))
 img=Image.alpha_composite(img,glow);d=ImageDraw.Draw(img,'RGBA')
 # mountains layered foreground silhouettes
 def mountain(baseline,height,count,c,seedx):
  rr=random.Random(seedx);pts=[(0,H)]
  for i in range(count+1):
   x=int(W*i/count);y=baseline-int(height*(.25+.75*rr.random()))
   pts.append((x,y))
  pts.extend([(W,H),(0,H)])
  d.polygon(pts,fill=c)
  for x,y in pts[1:-2]:
   d.line([(x,y),(x+16,y+33)],fill=(217,179,252,22),width=2)
 mountain(930,220,10,(34,19,64,255),40)
 mountain(1060,250,14,(19,15,45,255),42)
 # castles up on cliffs, on each side, independent scenery artwork behind boss
 def castle(cx,cy,ice=False):
  col=(24,41,76,255) if ice else (62,23,43,255)
  luminous=(43,172,255,255) if ice else (249,75,43,255)
  for i in range(4):
   tw=cx+(i-1.5)*47;top=cy-100-rnd.randrange(15,80)
   d.rectangle((tw-16,top,tw+16,cy+8),fill=col)
   d.polygon([(tw-23,top),(tw,top-31),(tw+23,top)],fill=col)
   for j in range(3):
    d.rectangle((tw-7,top+15+j*28,tw+2,top+25+j*28),fill=luminous)
  d.rectangle((cx-91,cy-70,cx+93,cy+35),fill=col)
  d.polygon([(cx-95,cy-70),(cx,cy-118),(cx+95,cy-70)],fill=col)
  for xx in range(-3,4):
   for yy0 in range(2):d.rectangle((cx+xx*23-3,cy-58+yy0*28,cx+xx*23+3,cy-47+yy0*28),fill=luminous)
 castle(171,718,False);castle(741,698,True)
 # waterfall blue spray / lava waterfall on sides
 for ice,x in ((False,192),(True,750)):
  for j in range(12):
   delta=rnd.randrange(-65,65);width=rnd.randrange(1,6)
   color=(52,192,255,93) if ice else (255,92,42,86)
   d.line([(x+delta,790),(x+delta-18,1199)],fill=color,width=width)
  for k in range(42):
   rx=x+rnd.randrange(-85,86);ry=rnd.randrange(845,1190)
   d.ellipse((rx,ry,rx+4,ry+4),fill=(90,212,255,120) if ice else (255,112,64,130))
 # Ancient stone courtyard with perspective vanishing near y=1130
 d.polygon([(0,1202),(900,1202),(900,H),(0,H)],fill=(22,23,42,255))
 for i in range(-12,25):
  x=450+i*60
  d.line([(450,1193),(x,1450)],fill=(181,134,201,75),width=2)
 for j in range(13):
  yy=1206+int((j/13)**1.7*244)
  d.line([(0,yy),(900,yy)],fill=(143,129,176,68),width=2)
 # Bolts and sparks subtle
 for x0,y0,side in [(89,395,-1),(800,383,1),(230,560,-1),(688,485,1)]:
  coords=[(x0,y0)]
  for k in range(8):
   coords.append((coords[-1][0]+rnd.randrange(-30,31),coords[-1][1]+rnd.randrange(24,44)))
  d.line(coords,fill=(237,168,255,84),width=9,joint='curve')
  d.line(coords,fill=(248,231,255,190),width=2,joint='curve')
 img.save(OUT/'v129_environment.png',optimize=True,compress_level=7)
 # foreground transparent fog/occlusion
 fog=Image.new('RGBA',(W,H));fd=ImageDraw.Draw(fog,'RGBA')
 for i in range(35):
  x=rnd.randrange(-100,1000);y=rnd.randrange(950,1420)
  fd.ellipse((x-170,y-30,x+170,y+30),fill=(165,110,230,rnd.randint(5,28)))
 fog=fog.filter(ImageFilter.GaussianBlur(44));fog.save(OUT/'v129_foreground_mist.png',optimize=True)

if __name__=='__main__':
 which=sys.argv[1] if len(sys.argv)>1 else 'all'
 if which in ('all','scene'):
  environment();print('environment ready',flush=True)
 if which in ('all','dragon'):
  for team in ['chat','creator']:
   for action in ['idle','roar','attack','hurt']:
    for frame in range(8):
     png(dragon(team,action,frame),f'v129_dragon_{team}_{action}_{frame}.png')
    print('dragon',team,action,flush=True)
 if which in ('all','boss'):
  for phase in [1,2,3]:
   for action in ['idle','summon','attack','hurt','defeat']:
    for frame in range(8):
     png(boss(phase,action,frame),f'v129_boss_{phase}_{action}_{frame}.png')
    print('boss',phase,action,flush=True)
 if which in ('all','tower'):
  for team in ['chat','creator']:
   for state in ['idle','hurt','critical','shield','destroy','rebuild']:
    for frame in range(8):
     png(tower(team,state,frame),f'v129_tower_{team}_{state}_{frame}.png')
    print('tower',team,state,flush=True)
 print('ART COMPLETE',len(list(OUT.glob('v129_*.png'))),flush=True)
