from loguru import logger 
import time 
def queue_monitor(queue, high_threshold, low_threshold, monitor_running):
    while monitor_running.is_set():
        queue_size = queue.qsize()
        if queue_size > high_threshold:
            logger.warning(f"Queue size ({queue_size}) exceeds high threshold ({high_threshold})! Load imbalance detected.")
        elif queue_size < low_threshold:
            logger.warning(f"Queue size ({queue_size}) lower than low threshold ({high_threshold})! Load imbalance detected.")
        else:
            logger.info(f"Queue size ({queue_size})")
        time.sleep(2)

            