import cv2
import numpy as np
import tensorflow as tf
from collections import deque


# ==========================================
# 1. LOAD MODEL
# ==========================================

model = tf.keras.models.load_model(
    "models/emotion_model_v3.keras"
)


# ==========================================
# 2. EMOTION LABELS
# ==========================================

emotion_labels = [
    "Angry",
    "Disgust",
    "Fear",
    "Happy",
    "Neutral & Engaged",
    "Sad",
    "Surprise"
]


# ==========================================
# 3. PREDICTION SMOOTHING
# ==========================================

# Store predictions from last 10 frames

prediction_history = deque(maxlen=10)


# ==========================================
# 4. LOAD FACE DETECTOR
# ==========================================

# The frontal face detector only finds faces that
# point roughly at the camera, so a detected face
# means the person is facing straight

face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades +
    "haarcascade_frontalface_default.xml"
)


# ==========================================
# 5. ATTENTION SETTINGS
# ==========================================

# Faces are searched for on a smaller copy of the
# frame, which is much faster on a CPU

DETECTION_SCALE = 0.5


# Store attention results from last 8 frames
# (1 = facing straight, 0 = looking away)

attention_history = deque(maxlen=8)


# Last place a face was seen, so "Distracted"
# can be drawn where the person is

last_face_box = None


# ==========================================
# 6. START WEBCAM
# ==========================================

cap = cv2.VideoCapture(0)


# Keep only the newest frame so the video
# doesn't fall behind

cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)


# Open the window on top of all other windows
# so it doesn't hide behind the editor

WINDOW_NAME = "Real-Time Facial Emotion Recognition"

cv2.namedWindow(WINDOW_NAME, cv2.WINDOW_NORMAL)

cv2.resizeWindow(WINDOW_NAME, 800, 600)

cv2.setWindowProperty(
    WINDOW_NAME,
    cv2.WND_PROP_TOPMOST,
    1
)


while True:

    ret, frame = cap.read()

    if not ret:
        print("Could not access webcam")
        break


    # ======================================
    # CONVERT TO GRAYSCALE
    # ======================================

    gray = cv2.cvtColor(
        frame,
        cv2.COLOR_BGR2GRAY
    )


    # ======================================
    # DETECT FACES (ON SMALLER FRAME)
    # ======================================

    small_gray = cv2.resize(
        gray,
        None,
        fx=DETECTION_SCALE,
        fy=DETECTION_SCALE
    )


    # Boost contrast so faces are found in dim light

    small_gray = cv2.equalizeHist(small_gray)

    faces = face_cascade.detectMultiScale(

        small_gray,

        scaleFactor=1.1,

        minNeighbors=5,

        minSize=(30, 30)

    )


    # ======================================
    # CHECK ATTENTION
    # ======================================

    attention_history.append(
        1 if len(faces) > 0 else 0
    )

    distracted = np.mean(attention_history) < 0.5


    # ======================================
    # PROCESS FACE
    # ======================================

    if len(faces) > 0:


        # Use the largest face, scaled back
        # to full frame size

        x, y, w, h = [
            int(v / DETECTION_SCALE)
            for v in max(faces, key=lambda f: f[2] * f[3])
        ]

        last_face_box = (x, y, w, h)


        # Crop face

        face = gray[
            y:y + h,
            x:x + w
        ]


        # Resize

        face = cv2.resize(
            face,
            (48, 48)
        )


        # Normalize

        face = face / 255.0


        # Add channel dimension

        face = np.expand_dims(
            face,
            axis=-1
        )


        # Add batch dimension

        face = np.expand_dims(
            face,
            axis=0
        )


        # ==================================
        # MODEL PREDICTION
        # ==================================

        # Calling the model directly is much
        # faster than model.predict() for a
        # single image

        prediction = model(
            face,
            training=False
        ).numpy()[0]


        # ==================================
        # STORE PREDICTION
        # ==================================

        prediction_history.append(
            prediction
        )


    # ======================================
    # DRAW RESULT
    # ======================================

    if last_face_box is not None:

        x, y, w, h = last_face_box


        if distracted:

            # Distracted replaces the emotion

            text = "Distracted"

            color = (0, 0, 255)

        else:

            # ==============================
            # CALCULATE AVERAGE PREDICTION
            # ==============================

            average_prediction = np.mean(
                prediction_history,
                axis=0
            )


            # Get final emotion

            predicted_index = np.argmax(
                average_prediction
            )


            emotion = emotion_labels[
                predicted_index
            ]


            confidence = (
                average_prediction[
                    predicted_index
                ] * 100
            )


            text = (
                f"{emotion}: "
                f"{confidence:.1f}%"
            )

            color = (0, 255, 0)


        # ==================================
        # DRAW RECTANGLE
        # ==================================

        cv2.rectangle(

            frame,

            (x, y),

            (x + w, y + h),

            color,

            2

        )


        # ==================================
        # DISPLAY TEXT
        # ==================================

        cv2.putText(

            frame,

            text,

            (x, y - 10),

            cv2.FONT_HERSHEY_SIMPLEX,

            0.8,

            color,

            2

        )


    # ======================================
    # DISPLAY WEBCAM
    # ======================================

    cv2.imshow(

        WINDOW_NAME,

        frame

    )


    # Press Q to exit

    if cv2.waitKey(1) & 0xFF == ord("q"):

        break


    # Closing the window with X also exits

    if cv2.getWindowProperty(
        WINDOW_NAME,
        cv2.WND_PROP_VISIBLE
    ) < 1:

        break


# ==========================================
# RELEASE WEBCAM
# ==========================================

cap.release()

cv2.destroyAllWindows()
