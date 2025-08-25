import asyncio
import random
from typing import Dict

from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google.cloud import aiplatform
from google.protobuf import json_format
from google.protobuf.struct_pb2 import Value

# --- FastAPI 앱 생성 및 CORS 설정 ---
app = FastAPI()

origins = [
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Google Cloud AI 예측 함수 (사용자가 제공한 코드) ---
def predict_tabular_classification_sample(
    project: str,
    endpoint_id: str,
    instance_dict: Dict,
    location: str = "asia-northeast3",
    api_endpoint: str = "asia-northeast3-aiplatform.googleapis.com",
):
    client_options = {"api_endpoint": api_endpoint}
    client = aiplatform.gapic.PredictionServiceClient(client_options=client_options)
    instance = json_format.ParseDict(instance_dict, Value())
    instances = [instance]
    parameters_dict = {}
    parameters = json_format.ParseDict(parameters_dict, Value())
    endpoint_path = client.endpoint_path(
        project=project, location=location, endpoint=endpoint_id
    )
    response = client.predict(
        endpoint=endpoint_path, instances=instances, parameters=parameters
    )
    print("response")
    print(" deployed_model_id:", response.deployed_model_id)
    predictions = response.predictions
    # 결과를 파이썬 dict 형태로 변환하여 반환
    return [dict(prediction) for prediction in predictions]

# --- 기존 루트 엔드포인트 ---
@app.get("/")
def read_root():
    return {"Hello": "World"}

# --- 새로운 AI 예측 엔드포인트 ---
@app.post("/predict")
def handle_prediction(instance_data: Dict):
    """
    프론트엔드로부터 예측 요청을 받아 Vertex AI에 예측을 수행하고 결과를 반환합니다.
    """
    try:
        # 아래 project_id와 endpoint_id를 당신의 정보로 수정
        project_id = "Andong04"
        endpoint_id = "asia-northeast3-aiplatform.googleapis.com"

        if project_id == "Andong04" or endpoint_id == "asia-northeast3-aiplatform.googleapis.com":
            raise HTTPException(status_code=500, detail="project ID and Endpoint ID are not configured in the backend code.")
            
        prediction_result = predict_tabular_classification_sample(
            project=project_id,
            endpoint_id=endpoint_id,
            instance_dict=instance_data
        )
        return {"prediction": prediction_result}
    except Exception as e:
        # 실제 운영 환경에서는 더 상세한 에러 로깅이 필요함.
        raise HTTPException(status_code=500, detail=str(e))

# --- 기존 실시간 시세 WebSocket 엔드포인트 ---
@app.websocket("/ws/stock-price")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try: 
        while True:
            mock_price = random.randint(30000, 40000)
            await websocket.send_json({"stock": "MyStock", "price": mock_price})
            await asyncio.sleep(1)
    except Exception as e:
        print(f"WebSocket Error: {e}")
    finally:
        print("Client disconnected")