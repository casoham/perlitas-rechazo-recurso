import json, random
random.seed(7)
dosis = [  # (altura del sedimento, turbidez final)
    (24, 0.50), (54, 0.30), (84, 0.12), (102, 0.03), (108, 0.07)]
jarras = ''
for i, (h, turb) in enumerate(dosis):
    x = i * 356
    parts = ''
    for k in range(9):
        cx = random.randint(60, 180); cy = random.randint(60, 250)
        parts += f'<circle class="part" style="--k:{k}; --i:{i}; --dy:{330 - h - cy}px" cx="{cx}" cy="{cy}" r="{random.randint(6, 10)}" fill="#fff"/>'
    jarras += f'''<div class="jarra" style="left:{x}px">
<svg width="240" height="410" viewBox="0 0 240 410" role="img" aria-label="Jarra {i + 1} con dosis creciente de reactivo">
<defs><clipPath id="jc{i}"><path d="M30 40H210V350Q210 384 176 384H64Q30 384 30 350Z"/></clipPath></defs>
<g clip-path="url(#jc{i})"><rect x="0" y="70" width="240" height="330" fill="#62c8f2"/>
<rect class="turbio" style="--t:{turb}" x="0" y="70" width="240" height="330" fill="#fff"/>
<g>{parts}</g>
<rect class="sedimento" style="--i:{i}" x="0" y="{384 - h}" width="240" height="{h}" fill="#f4f8ff"/></g>
<path d="M30 40H210V350Q210 384 176 384H64Q30 384 30 350Z" fill="rgba(255,255,255,.12)" stroke="#1b2a9b" stroke-width="7" stroke-linejoin="round"/>
<path d="M18 40H222" stroke="#1b2a9b" stroke-width="9" stroke-linecap="round"/>
</svg>
<div class="num-j{' mejor' if i == 3 else ''}">{i + 1}</div></div>
'''
html = f'''<section id="jarras" class="cielo" data-trans="ola">
<h2 class="titulo">La dosis se encuentra en jarras</h2>
<div class="lienzo">
{jarras}<div class="etq amarillo aparece" style="left:880px; top:495px; --d:5200; width:520px; text-align:center">La que mejor separa<small style="color:#4b3b00">define la dosis del piloto</small></div>
<div class="etq blanco aparece" style="left:0; top:610px; --d:1500">Reactivos a evaluar: cal, carbonato de sodio o hidróxido de sodio</div>
</div>
<div class="pie"><p>Esquema ilustrativo de una prueba de jarras · fuente: guía técnica del proyecto, v2 [1] [2]</p><p class="pag"></p></div>
<aside>La precipitación se ajusta con ensayos. En una prueba de jarras se prueba el mismo volumen de rechazo con dosis crecientes de reactivo, se mezcla, se deja sedimentar y se compara qué tanto se aclara el agua y cuánto lodo se forma. La alcalinidad y el pH determinan si hace falta aportar carbonato o elevar el pH; por eso se evalúan reactivos como cal, carbonato de sodio o hidróxido de sodio [1][2]. Este dibujo es un esquema para explicar el método, no un resultado nuestro: la dosis real sale de ensayar con el agua de Las Perlitas. Con la dosis y el caudal se estima el consumo de reactivo: dosis en miligramos por litro por caudal tratado en metros cúbicos por día, dividido entre mil, da kilos por día.</aside>
</section>
'''
open('diapositivas/jarras.html', 'w', encoding='utf-8').write(html)

css = '''
/* ===== Jarras: prueba de jarras (esquema) ===== */
#jarras .jarra { position: absolute; top: 0; width: 240px; }
#jarras .jarra svg { display: block; overflow: visible; }
#jarras .turbio { opacity: 0.65; animation: aclarar 5s ease-in-out 1.6s both; }
@keyframes aclarar { to { opacity: var(--t); } }
#jarras .part { animation: asentar-p 4.4s cubic-bezier(0.4, 0, 0.9, 0.6) both; animation-delay: calc(var(--i) * 250ms + var(--k) * 120ms + 1600ms); }
@keyframes asentar-p { to { transform: translateY(var(--dy)); opacity: 0; } }
#jarras .sedimento { transform-box: fill-box; transform-origin: 50% 100%; animation: crecer-s 4.6s ease-out both; animation-delay: calc(var(--i) * 250ms + 2600ms); transform: scaleY(0); }
@keyframes crecer-s { to { transform: scaleY(1); } }
#jarras .num-j { margin: 14px auto 0; width: 72px; height: 72px; border-radius: 50% 50% 50% 14%; background: #fff; color: var(--azul-marca); display: grid; place-items: center; font-size: 40px; font-weight: 800; box-shadow: 0 10px 24px rgba(27, 42, 155, 0.18); }
#jarras .num-j.mejor { animation: marcar 0.7s cubic-bezier(0.2, 1.4, 0.3, 1) both 5.2s; }
@keyframes marcar { to { background: var(--amarillo); transform: scale(1.18); } }
'''
open('piezas.css', 'a', encoding='utf-8').write(css)

c = json.load(open('presentacion.json', encoding='utf-8'))
o = c['orden']
if 'jarras' not in o:
    o.insert(o.index('quimica') + 1, 'jarras')
json.dump(c, open('presentacion.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print(o)
