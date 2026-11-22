import unittest

from run import app


class ShopSmartAPITestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app.config["TESTING"] = True
        cls.client = app.test_client()

    def test_home(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)

    def test_categories(self):
        response = self.client.get("/api/categories")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data["success"])
        self.assertGreaterEqual(data["total"], 8)

    def test_products(self):
        response = self.client.get("/api/products")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data["success"])
        self.assertGreaterEqual(data["total"], 25)

    def test_recommendations(self):
        response = self.client.get("/api/recommendations")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data["success"])
        self.assertIn("personalized", data)
        self.assertGreaterEqual(data["total"], 1)

    def test_cart_requires_authentication(self):
        response = self.client.get("/api/cart")
        self.assertIn(response.status_code, (401, 422))

    def test_checkout_requires_authentication(self):
        response = self.client.post("/api/checkout")
        self.assertIn(response.status_code, (401, 422))

    def test_admin_requires_authentication(self):
        response = self.client.get("/api/admin/dashboard")
        self.assertIn(response.status_code, (401, 422))


if __name__ == "__main__":
    unittest.main()
