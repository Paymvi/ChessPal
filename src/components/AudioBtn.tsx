import { Volume2, VolumeOff } from 'lucide-react';

interface AudioBtnProps {
    aEnabled: boolean;
    aToggle: () => void;
}

export function AudioBtn({aEnabled, aToggle} : AudioBtnProps){
    let CurrentAudio = Volume2;

    if(aEnabled){
        CurrentAudio = Volume2;
    }
    else{
        CurrentAudio = VolumeOff;
    }

    return (
        <div className="audio">
            <button className="move-reset-btn" onClick={aToggle}>
                <CurrentAudio size={16} />
            </button>
        </div>
    );
}

