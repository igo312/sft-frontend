from loguru import logger
import time 

class Timer:
    start_time = 0
    end_time = 0 
    # elapsed_time = 0
    @classmethod
    def start(cls):
        cls.start_time = time.time()
    
    @classmethod
    def end(cls):
        cls.end_time = time.time()
    
    @classmethod
    def elapsed_time(cls, func_name=""):
        logger.info("%s Time elapsed %.4f s."%(func_name, cls.end_time - cls.start_time))