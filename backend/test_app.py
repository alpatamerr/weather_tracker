import pytest
from app import app


@pytest.fixture()
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


def test_health_endpoint(client):
    response = client.get('/api/health')
    assert response.status_code == 200
    assert response.get_json()['status'] == 'healthy'


def test_home_endpoint(client):
    response = client.get('/')
    assert response.status_code == 200
    assert 'Weather API is running' in response.get_json()['message']


def test_weather_endpoint_requires_city_param(client):
    response = client.get('/api/weather')
    assert response.status_code == 200
