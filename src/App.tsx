import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { DeviceFrame } from './components/common/DeviceFrame';
import { Toast } from './components/common/Toast';

import { SplashScreen } from './components/screens/01_SplashScreen';
import { WelcomeScreen } from './components/screens/02_WelcomeScreen';
import { AccountTypeScreen } from './components/screens/03_AccountTypeScreen';
import { OwnerLoginScreen } from './components/screens/04_OwnerLoginScreen';
import { OwnerHomeScreen } from './components/screens/05_OwnerHomeScreen';
import { MembersScreen } from './components/screens/06_MembersScreen';
import { AddInviteMemberScreen } from './components/screens/07_AddInviteMemberScreen';
import { BroadcastComposerScreen } from './components/screens/08_BroadcastComposerScreen';
import { BroadcastPreviewScreen } from './components/screens/09_BroadcastPreviewScreen';
import { BroadcastDetailsScreen } from './components/screens/10_BroadcastDetailsScreen';
import { MemberRegistrationScreen } from './components/screens/11_MemberRegistrationScreen';
import { RegistrationSuccessScreen } from './components/screens/12_RegistrationSuccessScreen';
import { MemberHomeScreen } from './components/screens/13_MemberHomeScreen';
import { ChatScreen } from './components/screens/14_ChatScreen';
import { ImageViewerScreen } from './components/screens/15_ImageViewerScreen';
import { VideoViewerScreen } from './components/screens/16_VideoViewerScreen';
import { MemberProfileScreen } from './components/screens/17_MemberProfileScreen';
import { EmptyStateScreen } from './components/screens/18_EmptyStateScreen';
import { ErrorStateScreen } from './components/screens/19_ErrorStateScreen';

const MainAppContent: React.FC = () => {
  const { activeScreen } = useApp();

  const renderActiveScreen = () => {
    switch (activeScreen) {
      case '01_SPLASH':
        return <SplashScreen />;
      case '02_WELCOME':
        return <WelcomeScreen />;
      case '03_ACCOUNT_TYPE':
        return <AccountTypeScreen />;
      case '04_OWNER_LOGIN':
        return <OwnerLoginScreen />;
      case '05_OWNER_HOME':
        return <OwnerHomeScreen />;
      case '06_MEMBERS':
        return <MembersScreen />;
      case '07_ADD_INVITE':
        return <AddInviteMemberScreen />;
      case '08_BROADCAST_COMPOSER':
        return <BroadcastComposerScreen />;
      case '09_BROADCAST_PREVIEW':
        return <BroadcastPreviewScreen />;
      case '10_BROADCAST_DETAILS':
        return <BroadcastDetailsScreen />;
      case '11_MEMBER_REGISTRATION':
        return <MemberRegistrationScreen />;
      case '12_REGISTRATION_SUCCESS':
        return <RegistrationSuccessScreen />;
      case '13_MEMBER_HOME':
        return <MemberHomeScreen />;
      case '14_CHAT':
        return <ChatScreen />;
      case '15_IMAGE_VIEWER':
        return <ImageViewerScreen />;
      case '16_VIDEO_VIEWER':
        return <VideoViewerScreen />;
      case '17_MEMBER_PROFILE':
        return <MemberProfileScreen />;
      case '18_EMPTY_STATE':
        return <EmptyStateScreen />;
      case '19_ERROR_STATE':
        return <ErrorStateScreen />;
      default:
        return <SplashScreen />;
    }
  };

  return (
    <DeviceFrame>
      <Toast />
      <div className="w-full h-full flex flex-col overflow-hidden relative">
        {renderActiveScreen()}
      </div>
    </DeviceFrame>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
