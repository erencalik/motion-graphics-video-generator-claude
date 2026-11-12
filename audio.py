# python3 audio.py music.wav 3   -> synthesised pad + hits
import sys,wave,numpy as np
out,dur=sys.argv[1],float(sys.argv[2]);sr=44100;t=np.arange(int(sr*dur))/sr
pad=sum(np.sin(2*np.pi*f*t) for f in (110,164.8,220))*0.08*np.minimum(1,t/0.5)
def hit(at,f0=60):
    x=np.zeros_like(t);m=t>=at;tt=t[m]-at;x[m]=np.sin(2*np.pi*f0*tt*(1+3*np.exp(-tt*30)))*np.exp(-tt*8)*0.6;return x
y=pad+hit(0.0)+hit(0.8,90)
y=y/np.max(np.abs(y))*0.8;fade=np.minimum(1,(dur-t)/0.4);y*=fade
w=wave.open(out,'wb');w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr);w.writeframes((y*32767).astype(np.int16).tobytes());w.close()
