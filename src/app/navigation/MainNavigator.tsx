import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../../features/home/HomeScreen';
import { DashboardScreen } from '../../features/evaluator/DashboardScreen';
import { DetailsScreen } from '../../features/evaluator/DetailsScreen';
import EvaluatorSetupScreen from '../../features/evaluator/EvaluatorSetupScreen';
import CameraScreen from '../../features/scanning/camera/CameraScreen';
import ScanningScreen from '../../features/scanning/ScanningScreen';
import { ReportScreen } from '../../features/evaluator/ReportScreen';

const Stack = createNativeStackNavigator();

export const MainNavigator: React.FC = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
            }}
            initialRouteName="Home"
        >
            <Stack.Screen name="Home" component={HomeScreen} />

            {/* Evaluator Screens */}
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="Details" component={DetailsScreen} />
            <Stack.Screen name="Report" component={ReportScreen} />
            <Stack.Screen name="EvaluatorSetup" component={EvaluatorSetupScreen} />

            {/* Scanning Screens */}
            <Stack.Screen name="Scanning" component={ScanningScreen} />
            <Stack.Screen name="CameraScreen" component={CameraScreen} />
        </Stack.Navigator>
    );
};
