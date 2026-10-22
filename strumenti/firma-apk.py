#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""L'IMPRONTA DELLA FIRMA DI UN APK, SENZA JAVA.
   `apksigner` su questo Mac non parte («Unable to locate a Java
   Runtime»), e sapere se due apk hanno la stessa firma non e' un
   dettaglio: se cambia, chi ha gia' l'app deve disinstallarla e perde
   tutto — i percorsi che si e' registrato camminando, il contatto, casa.
   La firma pero' sta dentro il pacchetto e si legge: in fondo all'apk
   c'e' il blocco «APK Sig Block 42» con i certificati v2/v3, e
   l'impronta e' lo sha256 del primo.
   Si lancia:  python3 strumenti/firma-apk.py Yourbea-1.5.2.apk ..."""
import hashlib
import io
import struct
import sys


def pezzo(b, o):
    n = struct.unpack('<I', b[o:o + 4])[0]
    return b[o + 4:o + 4 + n], o + 4 + n


def impronta(apk):
    d = io.open(apk, 'rb').read()
    i = d.rfind(b'PK\x05\x06')
    if i < 0:
        return None
    inizioCD = struct.unpack('<I', d[i + 16:i + 20])[0]
    j = d.rfind(b'APK Sig Block 42', 0, inizioCD)
    if j < 0:
        return None
    dimFine = struct.unpack('<Q', d[j - 8:j])[0]
    blocco = d[j + 16 - 8 - dimFine + 8: j - 8]
    p = 0
    while p + 12 <= len(blocco):
        lung = struct.unpack('<Q', blocco[p:p + 8])[0]
        ident = struct.unpack('<I', blocco[p + 8:p + 12])[0]
        corpo = blocco[p + 12: p + 8 + lung]
        if ident in (0x7109871a, 0xf05368c0):        # v2, v3
            try:
                firmatari, _ = pezzo(corpo, 0)
                f1, _ = pezzo(firmatari, 0)
                dati, _ = pezzo(f1, 0)
                _, o2 = pezzo(dati, 0)               # i digest, che qui non servono
                certs, _ = pezzo(dati, o2)
                c1, _ = pezzo(certs, 0)
                return hashlib.sha256(c1).hexdigest()
            except Exception:
                pass
        p += 8 + lung
    return None


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('dimmi quali apk')
        sys.exit(1)
    for f in sys.argv[1:]:
        print('%-26s %s' % (f, impronta(f) or 'firma non letta'))
