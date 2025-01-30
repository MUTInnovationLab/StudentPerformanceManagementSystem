import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { AuthenticationService } from '../../services/auths.service';
import { ModalController } from '@ionic/angular';
import { InvitationModalComponent } from 'src/app/invitation-modal/invitation-modal.component';
import AgoraRTC, {
  IAgoraRTCClient,
  ILocalAudioTrack,
  ILocalVideoTrack,
  IRemoteVideoTrack,
  IRemoteAudioTrack,
  UID,
  ConnectionState,
  IAgoraRTCError,
  IAgoraRTCRemoteUser,
  ClientRole,
  ICameraVideoTrack,
  IMicrophoneAudioTrack
} from 'agora-rtc-sdk-ng';
import { ToastController, LoadingController, AlertController } from '@ionic/angular';

interface Participant {
  userName: string;
  userId: string;
  videoTrack?: IRemoteVideoTrack;
  audioTrack?: IRemoteAudioTrack;
  hasVideo: boolean;
  hasAudio: boolean;
}

interface DeviceInfo {
  hasCamera: boolean;
  hasMicrophone: boolean;
  cameraLabel?: string;
  microphoneLabel?: string;
  cameraId?: string;
  microphoneId?: string;
}

@Component({
  selector: 'app-live-meet',
  templateUrl: './live-meet.page.html',
  styleUrls: ['./live-meet.page.scss'],
})
export class LiveMeetPage implements OnInit, OnDestroy {
  menuVisible: boolean = false;
  private client: IAgoraRTCClient;
  private localAudioTrack: ILocalAudioTrack | null = null;
  private localVideoTrack: ILocalVideoTrack | null = null;
  private screenTrack: ILocalVideoTrack | null = null;
  private readonly appId: string = '0ebcc669c94a412082ab77393a192585';
  private isConnecting: boolean = false;
  private retryAttempts: number = 0;
  private readonly maxRetryAttempts: number = 3;
  private deviceInfo: DeviceInfo = {
    hasCamera: false,
    hasMicrophone: false
  };

  // Public properties
  userName: string = '';
  meetingId: string = '';
  participants: Participant[] = [];
  isJoined: boolean = false;
  isAudioEnabled: boolean = true;
  isVideoEnabled: boolean = true;
  isScreenSharing: boolean = false;
  isInitializing: boolean = true;
  hasDevicePermissions: boolean = false;
  minimizedVideos: Set<string> = new Set();
  fullscreenVideo: string | null = null;

  constructor(
    private toastController: ToastController,
    private router: Router,
    private auth: AuthenticationService,
    private authService: AuthenticationService,
    private loadingController: LoadingController,
    private modalController: ModalController, // Add this
    private alertController: AlertController,
    private ngZone: NgZone
  ) {
    this.client = AgoraRTC.createClient({
      mode: 'rtc',
      codec: 'vp8',
      role: 'host' as ClientRole
    });
  }
  openMenu() {
    this.menuVisible = !this.menuVisible;
  }
  Dashboard() {
    this.router.navigate(['/dashboard']);  // Ensure you have this route set up
    this.menuVisible = false;  // Hide the menu after selecting
  }
  async logout() {
    try {
      await this.authService.signOut();
      this.router.navigate(['/login']); // Redirect to login page after logout
      this.menuVisible = false;  // Hide the menu after logging out
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }


  async ngOnInit(): Promise<void> {
    try {
      this.setupAgoraListeners();
      await this.initializeDevices();
    } finally {
      this.isInitializing = false;
    }
  }

  private async initializeDevices(): Promise<void> {
    try {
      await this.checkDevices();
      this.hasDevicePermissions = true;
    } catch (error) {
      console.error('Failed to initialize devices:', error);
      this.hasDevicePermissions = false;
      await this.showDevicePermissionAlert();
    }
  }
  async toggleMinimize(userId: string): Promise<void> {
    if (this.minimizedVideos.has(userId)) {
      this.minimizedVideos.delete(userId);
      // Reattach video to main container
      const participant = this.participants.find(p => p.userId === userId);
      if (participant?.videoTrack) {
        participant.videoTrack.play(`video-${userId}`);
      }
    } else {
      this.minimizedVideos.add(userId);
      // Reattach video to mini player
      const participant = this.participants.find(p => p.userId === userId);
      if (participant?.videoTrack) {
        participant.videoTrack.play(`video-${userId}-mini`);
      }
    }
  }
  
  async toggleFullscreen(userId: string): Promise<void> {
    if (this.fullscreenVideo === userId) {
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
        this.fullscreenVideo = null;
      } catch (error) {
        console.error('Error exiting fullscreen:', error);
      }
    } else {
      try {
        const element = document.getElementById(`video-container-${userId}`);
        if (element) {
          await element.requestFullscreen();
          this.fullscreenVideo = userId;
        }
      } catch (error) {
        console.error('Error entering fullscreen:', error);
      }
    }
  }

  private async showDevicePermissionAlert(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Device Permissions Required',
      message: 'Camera and microphone access is needed for the meeting. Please enable them in your browser settings.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Retry',
          handler: () => {
            this.initializeDevices();
          }
        }
      ]
    });
    await alert.present();
  }

  private async checkDevices(): Promise<void> {
    try {
      const devices = await AgoraRTC.getDevices();
  
      console.log('Available devices:', devices); // Log all available devices
  
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      const audioDevices = devices.filter(device => device.kind === 'audioinput');
  
      this.deviceInfo = {
        hasCamera: videoDevices.length > 0,
        hasMicrophone: audioDevices.length > 0,
        cameraLabel: videoDevices[0]?.label || 'No Camera Found',
        microphoneLabel: audioDevices[0]?.label || 'No Microphone Found',
        cameraId: videoDevices[0]?.deviceId,
        microphoneId: audioDevices[0]?.deviceId
      };
  
      if (!this.deviceInfo.hasCamera && !this.deviceInfo.hasMicrophone) {
        throw new Error('No camera or microphone detected');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Error checking devices:', errorMessage);
      throw error;
    }
  }  

  private async requestDevicePermissions(): Promise<void> {
    try {
      const constraints = {
        video: this.deviceInfo.cameraId ? { deviceId: { exact: this.deviceInfo.cameraId } } : true,
        audio: this.deviceInfo.microphoneId ? { deviceId: { exact: this.deviceInfo.microphoneId } } : true
      };
  
      console.log('Requesting permissions with constraints:', constraints); // Log the constraints being requested
  
      await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Error requesting permissions:', errorMessage);
  
      // Check if the error is due to the requested device not being found
      if (errorMessage.includes('Requested device not found')) {
        await this.showToast('Requested device not found. Please check your device connections.');
      }
  
      throw new Error('Failed to get media permissions');
    }
  }

  private setupAgoraListeners(): void {
    this.client.on('connection-state-change', (curState: ConnectionState, prevState: ConnectionState, reason: string) => {
      console.log('Connection state changed:', prevState, 'to', curState, 'reason:', reason);
      this.ngZone.run(() => {
        if (curState === 'DISCONNECTED') {
          this.handleDisconnection();
        }
      });
    });

    this.client.on('user-published', async (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
      try {
        await this.client.subscribe(user, mediaType);

        this.ngZone.run(() => {
          const participant = this.participants.find(p => p.userId === user.uid.toString()) || {
            userName: user.uid.toString(),
            userId: user.uid.toString(),
            hasVideo: false,
            hasAudio: false
          };

          if (mediaType === 'video') {
            participant.videoTrack = user.videoTrack as IRemoteVideoTrack;
            participant.hasVideo = true;
            participant.videoTrack.play(`video-${user.uid}`);
          } else if (mediaType === 'audio') {
            participant.audioTrack = user.audioTrack as IRemoteAudioTrack;
            participant.hasAudio = true;
            participant.audioTrack.play();
          }

          if (!this.participants.find(p => p.userId === user.uid.toString())) {
            this.participants.push(participant);
          }
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        console.error('Error in user-published event:', errorMessage);
      }
    });

    this.client.on('user-unpublished', (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
      this.ngZone.run(() => {
        const participant = this.participants.find(p => p.userId === user.uid.toString());
        if (participant) {
          if (mediaType === 'video') {
            participant.hasVideo = false;
            if (participant.videoTrack) {
              participant.videoTrack.stop();
              participant.videoTrack = undefined;
            }
          } else if (mediaType === 'audio') {
            participant.hasAudio = false;
            if (participant.audioTrack) {
              participant.audioTrack.stop();
              participant.audioTrack = undefined;
            }
          }
        }
      });
    });

    this.client.on('user-left', (user: IAgoraRTCRemoteUser) => {
      this.ngZone.run(() => {
        this.participants = this.participants.filter(p => p.userId !== user.uid.toString());
        this.showToast(`Participant left the meeting`);
      });
    });

    this.client.on('error', (error: IAgoraRTCError) => {
      this.ngZone.run(() => {
        console.error('Agora client error:', error);
        this.showToast(`Connection error: ${error.message}`);
      });
    });
  }

  private async createLocalTracks(): Promise<[IMicrophoneAudioTrack?, ICameraVideoTrack?]> {
    const tracks: [IMicrophoneAudioTrack?, ICameraVideoTrack?] = [undefined, undefined];
    
    try {
        if (this.deviceInfo.hasMicrophone) {
            tracks[0] = await AgoraRTC.createMicrophoneAudioTrack();
        }
        
        if (this.deviceInfo.hasCamera) {
            tracks[1] = await AgoraRTC.createCameraVideoTrack();
        }
        
        return tracks;
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        console.error('Error creating local tracks:', errorMessage);
        throw error;
    }
}



  async shareScreen(): Promise<void> {
    if (this.isScreenSharing) {
      await this.stopScreenSharing();
    } else {
      try {
        const screenTrackResult = await AgoraRTC.createScreenVideoTrack(
          { encoderConfig: '1080p_1' }, // Set resolution
          'auto' // Enables audio if available
        );
  
        // Check if screenTrackResult is an array (video and audio) or a single video track
        this.screenTrack = Array.isArray(screenTrackResult) ? screenTrackResult[0] : screenTrackResult;
        
        await this.client.unpublish(this.localVideoTrack as ILocalVideoTrack);
        await this.client.publish(this.screenTrack);
  
        this.isScreenSharing = true;
        this.showToast('Screen sharing enabled');
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        console.error('Failed to share screen:', errorMessage);
      }
    }
  }
  
  async stopScreenSharing(): Promise<void> {
    if (this.isScreenSharing && this.screenTrack) {
      try {
        await this.client.unpublish(this.screenTrack);
        this.screenTrack.stop(); // Stop the screen track
        this.screenTrack.close(); // Close the screen track
        this.screenTrack = null; // Set screen track to null
  
        // Re-publish the local video track if it exists
        if (this.localVideoTrack) {
          await this.client.publish(this.localVideoTrack);
        }
  
        this.isScreenSharing = false;
        this.showToast('Screen sharing stopped');
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        console.error('Failed to stop screen sharing:', errorMessage);
      }
    } else {
      console.warn('No active screen sharing to stop'); // Log if no screen sharing is active
    }
  }  
  
  async toggleAudio(): Promise<void> {
    try {
      if (!this.localAudioTrack) {
        // If no audio track exists and microphone is available, create one
        if (this.deviceInfo.hasMicrophone) {
          const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
          this.localAudioTrack = audioTrack;
          if (this.isJoined) {
            await this.client.publish(audioTrack);
          }
          this.isAudioEnabled = true;
          await this.showToast('Microphone enabled');
          return;
        } else {
          await this.showToast('No microphone available');
          return;
        }
      }

      // Toggle existing audio track
      this.isAudioEnabled = !this.isAudioEnabled;
      
      if (this.isAudioEnabled) {
        await this.localAudioTrack.setEnabled(true);
        if (this.isJoined && !this.client.localTracks.includes(this.localAudioTrack)) {
          await this.client.publish(this.localAudioTrack);
        }
      } else {
        await this.localAudioTrack.setEnabled(false);
        if (this.isJoined) {
          await this.client.unpublish(this.localAudioTrack);
        }
      }

      await this.showToast(`Microphone ${this.isAudioEnabled ? 'enabled' : 'disabled'}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Error toggling audio:', errorMessage);
      await this.showToast(`Failed to toggle microphone: ${errorMessage}`);
    }
  }

  async toggleVideo(): Promise<void> {
    if (this.localVideoTrack) {
      this.isVideoEnabled = !this.isVideoEnabled;
      this.localVideoTrack.setEnabled(this.isVideoEnabled);
      this.showToast(`Camera ${this.isVideoEnabled ? 'enabled' : 'disabled'}`);
    }
  }

  async joinMeeting(): Promise<void> {
    if (!this.meetingId) {
      await this.showToast('Please enter a meeting ID');
      return;
    }
    if (this.isConnecting || this.isJoined) return;

    this.isConnecting = true;
    const loading = await this.loadingController.create({
      message: 'Joining the meeting...'
    });
    await loading.present();

    try {
      await this.client.join(this.appId, this.meetingId, null, this.userName);
      const [audioTrack, videoTrack] = await this.createLocalTracks();

      if (audioTrack) {
        this.localAudioTrack = audioTrack;
        await this.client.publish(this.localAudioTrack);
        
      }
      if (videoTrack) {
        this.localVideoTrack = videoTrack;
        await this.client.publish(this.localVideoTrack);
        this.localVideoTrack.play('local-video');
      }

      this.isJoined = true;
      this.showToast('Joined the meeting successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Failed to join the meeting:', errorMessage);
      await this.showToast(`Failed to join the meeting: ${errorMessage}`);
    } finally {
      this.isConnecting = false;
      loading.dismiss();
    }
  }

  async leaveMeeting(): Promise<void> {
    if (!this.isJoined) return;
    
    await this.showToast('Leaving the meeting...');
    await this.client.leave();

    if (this.localAudioTrack) {
      this.localAudioTrack.stop();
      this.localAudioTrack.close();
      this.localAudioTrack = null;
    }
    if (this.localVideoTrack) {
      this.localVideoTrack.stop();
      this.localVideoTrack.close();
      this.localVideoTrack = null;
    }

    this.participants = [];
    this.isJoined = false;
    this.showToast('Left the meeting successfully');
  }

  private async showToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom'
    });
    await toast.present();
  }

  private handleDisconnection(): void {
    this.isJoined = false;
    this.participants = [];
    this.showToast('Disconnected from the meeting');
  }
  async openInviteDialog(): Promise<void> {
    const modal = await this.modalController.create({
      component: InvitationModalComponent,
      componentProps: {
        meetingId: this.meetingId,
        hostName: this.userName
      },
      cssClass: 'invitation-modal'
    });

    await modal.present();
  }


  ngOnDestroy(): void {
    this.leaveMeeting();
  }
}
