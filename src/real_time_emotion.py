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

face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades +
    "haarcascade_frontalface_default.xml"
)


eye_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades +
    "haarcascade_eye_tree_eyeglasses.xml"
)


# ==========================================
# 5. ATTENTION (FACING STRAIGHT) SETTINGS
# ==========================================

# How far (as a fraction of face width) the midpoint
# between the eyes may drift from the face centre
# before the head counts as turned sideways

MAX_EYE_OFFSET = 0.12


# How much higher one eye may be than the other
# (as a fraction of face height) before the head
# counts as tilted

MAX_EYE_TILT = 0.10


# Store attention results from last 15 frames
# (1 = facing straight, 0 = distracted)

attention_history = deque(maxlen=15)


def facing_straight(face_gray):

    """Person counts as facing straight when both eyes
    are visible and sit evenly on either side of the
    face centre. Eye contact with the camera is not
    required."""

    h, w = face_gray.shape

    # Eyes are in the upper half of the face

    upper_face = face_gray[:h // 2, :]

    eyes = eye_cascade.detectMultiScale(
        upper_face,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(w // 8, w // 8)
    )

    # Head turned, looking down or eyes closed

    if len(eyes) < 2:
        return False

    # Keep the two largest detections

    eyes = sorted(
        eyes,
        key=lambda e: e[2] * e[3],
        reverse=True
    )[:2]

    centres = [
        (ex + ew / 2, ey + eh / 2)
        for (ex, ey, ew, eh) in eyes
    ]

    (x1, y1), (x2, y2) = centres

    # Both detections on the same side = false match

    if abs(x1 - x2) < w * 0.2:
        return False

    # Head turned left / right

    eyes_midpoint = (x1 + x2) / 2

    if abs(eyes_midpoint - w / 2) > w * MAX_EYE_OFFSET:
        return False

    # Head tilted

    if abs(y1 - y2) > h * MAX_EYE_TILT:
        return False

    return True


# ==========================================
# 6. START WEBCAM
# ==========================================

cap = cv2.VideoCapture(0)


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
    # DETECT FACES
    # ======================================

    faces = face_cascade.detectMultiScale(

        gray,

        scaleFactor=1.1,

        minNeighbors=5,

        minSize=(50, 50)

    )


    # ======================================
    # NO FACE = LOOKING AWAY
    # ======================================

    if len(faces) == 0:

        attention_history.append(0)

        if np.mean(attention_history) < 0.5:

            cv2.putText(
                frame,
                "Distracted",
                (20, 40),
                cv2.FONT_HERSHEY_SIMPLEX,
                1.0,
                (0, 0, 255),
                2
            )


    # ======================================
    # PROCESS FACE
    # ======================================

    for (x, y, w, h) in faces:


        # Crop face

        face = gray[
            y:y + h,
            x:x + w
        ]


        # ==================================
        # CHECK ATTENTION
        # ==================================

        attention_history.append(
            1 if facing_straight(face) else 0
        )

        distracted = np.mean(attention_history) < 0.5


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

        prediction = model.predict(
            face,
            verbose=0
        )[0]


        # ==================================
        # STORE PREDICTION
        # ==================================

        prediction_history.append(
            prediction
        )


        # ==================================
        # CALCULATE AVERAGE PREDICTION
        # ==================================

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


        # Green when engaged, red when distracted

        color = (0, 0, 255) if distracted else (0, 255, 0)


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
        # DISPLAY EMOTION
        # ==================================

        # Distracted replaces the emotion

        if distracted:

            text = "Distracted"

        else:

            text = (
                f"{emotion}: "
                f"{confidence:.1f}%"
            )


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

        "Real-Time Facial Emotion Recognition",

        frame

    )


    # Press Q to exit

    if cv2.waitKey(1) & 0xFF == ord("q"):

        break


# ==========================================
# RELEASE WEBCAM
# ==========================================

cap.release()

cv2.destroyAllWindows()