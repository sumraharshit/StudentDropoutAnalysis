from flask import Flask, render_template, request
import pickle
import pandas as pd

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_secret_key' 


model = pickle.load(open('trained_dropout_model.pkl', 'rb'))

with open('label_encoders.pkl', 'rb') as encoder_file:
    label_encoders = pickle.load(encoder_file)

with open('target_encoder.pkl', 'rb') as target_encoder_file:
    le_target = pickle.load(target_encoder_file)

def safe_transform(encoder, value):
    if value in encoder.classes_:
        return encoder.transform([value])[0]
    else:
        print(f"Warning: Unseen category '{value}' encountered. Using fallback value.")
        return -1

from flask_wtf import FlaskForm
from wtforms import StringField, SubmitField
from wtforms.validators import DataRequired

class PredictForm(FlaskForm):
    q1 = StringField('Question 1', validators=[DataRequired()])
    q2 = StringField('Question 2', validators=[DataRequired()])
    q3 = StringField('Question 3', validators=[DataRequired()])
    q4 = StringField('Question 4', validators=[DataRequired()])
    q5 = StringField('Question 5', validators=[DataRequired()])
    q6 = StringField('Question 6', validators=[DataRequired()])
    q7 = StringField('Question 7', validators=[DataRequired()])
    q8 = StringField('Question 8', validators=[DataRequired()])
    q9 = StringField('Question 9', validators=[DataRequired()])
    q10 = StringField('Question 10', validators=[DataRequired()])
    q11 = StringField('Question 11', validators=[DataRequired()])
    q12 = StringField('Question 12', validators=[DataRequired()])
    q13 = StringField('Question 13', validators=[DataRequired()])
    q14 = StringField('Question 14', validators=[DataRequired()])
    q15 = StringField('Question 15', validators=[DataRequired()])
    q16 = StringField('Question 16', validators=[DataRequired()])
    q17 = StringField('Question 17', validators=[DataRequired()])
    q18 = StringField('Question 18', validators=[DataRequired()])
    q19 = StringField('Question 19', validators=[DataRequired()])
    q20 = StringField('Question 20', validators=[DataRequired()])
    submit = SubmitField('Predict')

@app.route('/predict', methods=['GET', 'POST'])
def predict():
    form = PredictForm(request.form)
    prediction_label = None

    if request.method == 'POST' and form.validate():
        
        features = []
        feature_names = [f"Q{i}" for i in range(1, 21)]
        for i in range(1, 21):
            answer = getattr(form, f'q{i}').data
          
            encoder = label_encoders.get(feature_names[i-1])
            if encoder:
                transformed = safe_transform(encoder, answer)
            else:
                try:
                    transformed = float(answer)
                except ValueError:
                    transformed = answer
            features.append(transformed)

     
        feat_df = pd.DataFrame([features], columns=feature_names)
        
      
        prediction = model.predict(feat_df)[0]
       
        prediction_label = le_target.inverse_transform([prediction])[0]

        return render_template('predictform.html', form=form, prediction=prediction_label)

  
    return render_template('predictform.html', form=form, prediction=prediction_label)

if __name__ == '__main__':
    app.run(debug=True)
