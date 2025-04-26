from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
import torch
from PIL import Image
from io import BytesIO
from torchvision import transforms

# Initialize FastAPI app
app = FastAPI()

# Load the number plate detection model
MODEL_PATH = "C:\\Users\\HP\\Downloads\\React App\\vision-pro\\src\\best.pt"
model = torch.load(MODEL_PATH, map_location=torch.device('cpu'))  # Adjust device as needed
model.eval()

def read_image(file: bytes) -> Image.Image:
    """Reads an image file and converts it to a PIL image."""
    return Image.open(BytesIO(file))

def preprocess_image(image: Image.Image):
    """Preprocesses the image before passing to the model."""
    transform = transforms.Compose([
        transforms.Resize((640, 640)),  # Resize to model input size
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    return transform(image).unsqueeze(0)  # Add batch dimension

@app.post("/detect-number-plate/")
async def detect_number_plate(file: UploadFile = File(...)):
    try:
        image = read_image(await file.read())
        # Preprocess the image
        transformed_image = preprocess_image(image)

        # Run inference
        with torch.no_grad():
            result = model(transformed_image)

        # Process the result (this part depends on your model's output format)
        # For example, if it's a bounding box output:
        # processed_result = {"boxes": result[0].tolist()}  # Example output
        processed_result = {"message": "Result processed successfully", "detections": result.tolist()}

        return JSONResponse(content=processed_result)
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)
