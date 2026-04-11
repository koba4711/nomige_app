from flask import Flask, render_template
from config import APP_INFO

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html", app_info=APP_INFO)

@app.route("/about")
def about():
    return render_template("about.html", app_info=APP_INFO)

@app.route("/how-to-play")
def how_to_play():
    return render_template("how_to_play.html", app_info=APP_INFO)

@app.route("/contact")
def contact():
    return render_template("contact.html", app_info=APP_INFO)

if __name__ == "__main__":
    app.run(debug=True)