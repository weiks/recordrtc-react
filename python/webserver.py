import string,cgi,time
from os import curdir, sep
from BaseHTTPServer import BaseHTTPRequestHandler, HTTPServer
import os
import sys
import json
import glob
import numpy as np
import scipy.misc

from theano import *

import keras
from keras.models import Sequential
from keras.layers import Dense, Dropout, Flatten
from keras.layers import Conv2D, MaxPooling2D
from keras import backend as K

from keras.utils import np_utils

from urlparse import urlparse, parse_qs
from keras.models import model_from_json
import urllib
import time
import requests
import urlparse
from subprocess import call

img_rows, img_cols = 258,400
input_shape = (img_rows, img_cols, 1)
num_classes = 2

model = Sequential()
model.add(Conv2D(32, kernel_size=(11, 11), strides=(4,4),
    activation='relu',
    input_shape=input_shape))
model.add(Conv2D(64, (3, 3), activation='relu'))
model.add(MaxPooling2D(pool_size=(2, 2)))
model.add(Dropout(0.25))
model.add(Flatten())
model.add(Dense(128, activation='relu'))
model.add(Dropout(0.5))
model.add(Dense(num_classes, activation='softmax'))
model.compile(loss=keras.losses.binary_crossentropy,
    optimizer=keras.optimizers.Adadelta(),
    metrics=['accuracy'])

model.load_weights("model11x11.h5")
print "model loaded"

class MyHandler(BaseHTTPRequestHandler):

    def do_GET(self):
        try:
            filename = time.strftime("%d-%m-%Y-%M-%S")
            print self.path
            url = self.path
            par = urlparse.parse_qs(urlparse.urlparse(url).query)
            s3url = str(par['s3'][0])
            print s3url
            urllib.urlretrieve(s3url,  filename + ".ogg")
            opts = "-i " + filename + ".ogg -acodec libmp3lame " + filename +".mp3"
            os.system("ffmpeg " + opts)
            opts = filename + ".mp3 -n spectrogram -o " + filename + ".png -m -x 400 -y 258 -L -R 50:8k -r"
            os.system("sox " + opts)
            opts = "-resize 400x258 -background black -compose Copy -gravity center -extent 400x258 " + filename + ".png " + filename + "-rs.png"
            os.system("convert " + opts)


            spectrogram = np.array([scipy.misc.imread(filename + "-rs.png")])
            spectrogram = spectrogram.reshape(1,img_rows,img_cols,1)
            spectrogram = spectrogram.astype('float32')
            spectrogram /= 255


            pred = model.predict(spectrogram)
            print pred

            os.system("rm " + filename + "*")
            data = { "result": 1}  # 1 is good

            if pred[0][0] < 0.5:
                data = {"result": 0}  # 0 is kid
            print data
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(data))

            return 
                   
        except IOError:
            self.send_error(404,'File Not Found: %s' % self.path)        

def main():

    try:
        server = HTTPServer(('', 80), MyHandler)
        print 'started httpserver...'
        server.serve_forever()
    except KeyboardInterrupt:
        print '^C received, shutting down server'
        server.socket.close()

if __name__ == '__main__':
    main()

