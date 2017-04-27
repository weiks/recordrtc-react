import React from 'react';
import { captureUserMedia, S3Upload } from './AppUtils';
import Webcam from './Webcam.react';
import RecordRTC from 'recordrtc';
import { Modal } from 'react-bootstrap';

const hasGetUserMedia = !!(navigator.getUserMedia || navigator.webkitGetUserMedia ||
                        navigator.mozGetUserMedia || navigator.msGetUserMedia);

class RecordPage extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      recordVideo: null,
      src: null,
      uploadSuccess: null,
      uploading: false,
      sessionStarted: false,
      isNoteError: false
    };

    this.requestUserMedia = this.requestUserMedia.bind(this);
    this.startRecord = this.startRecord.bind(this);
    this.stopRecording = this.stopRecording.bind(this);
    this.sendRecording = this.sendRecording.bind(this);
  }

  componentDidMount() {
    if(!hasGetUserMedia) {
      alert("Your browser cannot stream from your webcam. Please switch to Chrome or Firefox.");
      return;
    }
    this.requestUserMedia();
  }

  requestUserMedia() {
    console.log('requestUserMedia')
    captureUserMedia((stream) => {
      this.setState({ src: window.URL.createObjectURL(stream) });
      console.log('setting state', this.state)
    });
  }

  startRecord() {
    this.state.sessionStarted = true;

    const self = this;
    captureUserMedia((stream) => {

      this.state.recordVideo = RecordRTC(stream, { type: 'audio' });
      this.state.recordVideo.setRecordingDuration(1000, () => {
        console.log('Sending');
        console.log(self.state.recordVideo.blob);
        self.sendRecording(self.state.recordVideo.blob);

        if (this.state.sessionStarted)
          self.startRecord();
      });
      this.state.recordVideo.startRecording();
    });

  }

  stopRecording() {
    this.state.sessionStarted = false;
  }

  sendRecording(audioPart) {
    //this.state.recordVideo.stopRecording(() => {
      const id = Math.floor(Math.random()*90000) + 10000;
      let params = {
        type: 'audio/ogg',
        data: audioPart,
        id: id
      }

      this.setState({ uploading: true });

      const self = this;

      S3Upload(params)
      .then((success) => {
        console.log('enter then statement')
        if(success) {
          console.log(success)
          this.setState({ uploadSuccess: true, uploading: false });
          self.checkRecordingStatus(id);
        }
      }, (error) => {
        alert(error, 'error occurred. check your aws settings and try again.')
      });
    //});
  }

  checkRecordingStatus(partId) {
    let queryString = '?partId=' + partId;
    fetch('https://wbebf3n8y1.execute-api.us-east-1.amazonaws.com/dev/evaluate-performance/' + queryString)
  .then((response) => {
    return response.json()
  })
  .then(response => {
    console.log(response)
    if (response.result === 1)
      this.setState({isNoteError:true});
  })
  .catch((err) => {
    console.log('error: ', err)
  })
  } 

  render() {
    return(
      <div>
        <Modal show={this.state.uploadSuccess}><Modal.Body>Upload success!</Modal.Body></Modal>
        <div><Webcam src={this.state.src}/></div>

        <div>

        {!this.state.sessionStarted ? 
          <button onClick={this.startRecord}>Start Record</button>  :
          <button onClick={this.stopRecording}>Stop Recording</button>
        }    

        {this.state.isNoteError ?
          <span>Error on Note!</span> :
          null
        }      
        </div>
      </div>
    )
  }
}

export default RecordPage;

