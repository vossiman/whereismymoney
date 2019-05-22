import classifyStmts

#classifyStmts.classify_statements()

import os
import os

from watchdog.events import RegexMatchingEventHandler

import sys
import time
import logging
import datetime
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import asyncio
 
class MyEventHandler(FileSystemEventHandler):
    
    def __init__(self):
        super().__init__()
        self.lastEvent = datetime.datetime.now()

    def on_modified(self, event):
        eventTime = datetime.datetime.now()      
        delta = datetime.timedelta(milliseconds=1000)
        eventCompare = eventTime-delta
        # print(F'{self.lastEvent} < {eventCompare}')

        if (self.lastEvent<eventCompare): 
            self.lastEvent = eventTime
            
            print(f'event type: {event.event_type}  path : {event.src_path}') 
            if (event.src_path == '.\data\classification_live.json'):
                classifyStmts.classify_statements()



if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO,
                        format='%(asctime)s - %(message)s',
                        datefmt='%Y-%m-%d %H:%M:%S')    
    # path = sys.argv[1] if len(sys.argv) > 1 else '.'
    path = '.\\data'
    event_handler = MyEventHandler()
    observer = Observer()
    observer.schedule(event_handler, path, recursive=False)
    observer.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()