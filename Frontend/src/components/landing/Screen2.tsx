// import { useRef, useState } from 'react';
// import { colors } from '../../theme/colors';
// import {z} from 'zod';
// import {useApp} from '../../../Context/AppContext.jsx';



// type Screen2Props = {
//   isActive: boolean;
//   onMoveForward:()=>void;
  
// };

// const audioSchema = z.object({
//   fileid : z.string().optional(),
//   filename : z.string().min(1, "Filename is required"),
//   filetype : z.string().startsWith("audio/", "File must be an audio type"),
//   filesize : z.number().max(524288000, "File size must be between 1 Byte ro 500 MB"), 
//   duration : z.number().min(1, "Duration must be at least 1 second").max(36000, "Duration must be less than or equal to 10 hours"),
// })

// export default function Screen2({ isActive,onMoveForward }: Screen2Props) {
//   const inputRef = useRef<HTMLInputElement | null>(null);
//   const audioRef = useRef<HTMLAudioElement | null>(null);
//   const [selectedFile, setSelectedFile] = useState<File | null>(null);
//   const [audioUrl, setAudioUrl] = useState('');
//   const [isDragging, setIsDragging] = useState(false);
//   const [showh1, setShowh1] = useState(true);
//   const [audioDuration, setAudioDuration] = useState('');
//   const [isPlaying, setIsPlaying] = useState(false);
//   const [currentTime, setCurrentTime] = useState(0);
//   // const [audioId, setAudioId] = useState(null);

//   const {setAudioId} = useApp();
//   const { audioId } = useApp(); 

//   const formatTime = (value: number) => {
//     const safeValue = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
//     const minutes = Math.floor(safeValue / 60);
//     const seconds = safeValue % 60;
//     return `${minutes}:${seconds.toString().padStart(2, '0')}`;
//   };

//   let extractedid:any;

//   const handleFile = async (file: File | null) => {
//     if (!file) return;

//     setSelectedFile(file);
//     setShowh1(false);
//     setCurrentTime(0);

    
//     const nextUrl = URL.createObjectURL(file);
//     setAudioUrl(nextUrl);

//     const durationInSeconds = await new Promise<number>((resolve) => {
//   const audio = new Audio(nextUrl);

//   audio.onloadedmetadata = () => {
//     const safeDuration = Number.isFinite(audio.duration) ? Math.floor(audio.duration) : 0;
//     resolve(safeDuration);
//   };

//   audio.onerror = () => resolve(0);
// });

// setAudioDuration(formatTime(durationInSeconds));
// console.log('Audio duration (seconds):', durationInSeconds);

 

//     if (inputRef.current) {
//       inputRef.current.value = '';
//     }

//     const metadata = {
//       filename: file.name,
//       filetype: file.type,
//       filesize: file.size,
//       duration: durationInSeconds,
//     };

    

//     const validationResult = audioSchema.safeParse(metadata);
//     if (!validationResult.success) {
//       console.error('Validation failed:', validationResult.error.format());
//     } else {
//       console.log('Validation succeeded:', validationResult.data);
//     }

//     try {
//       const response = await fetch('http://localhost:5252/api/Audio/generate-presigned-url', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           filename: file.name,
//           file_type: file.type,
//         }),
//       });

//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }

//       const data = await response.json();
//       const presignedUrl = data.presignedurl;
//       const filekey = data.filekey;

//       const upload = await fetch(presignedUrl, {
//         method: 'PUT',
//         headers: {
//           'Content-Type': file.type,
//         },
//         body: file,
//       });

      

//       if (upload.ok) {
//        console.log('File successfully written to cloud');

//        try {
//         const saveResponse = await fetch('http://localhost:5252/api/Audio/save-to-db', {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//           },
//           body: JSON.stringify({
//             filename: file.name,
//             filetype: file.type,
//             filesize: file.size,
//             duration: durationInSeconds,
//             status: 'PENDING',
//             filekey: filekey,
//           }),
//         })

//         console.log('Data', {filename: file.name, filetype: file.type, filesize: file.size, duration: durationInSeconds, status: 'PENDING', filekey: filekey});

//         if (!saveResponse.ok) {
//           throw new Error(`HTTP error! status: ${saveResponse.status}`);
//         }
        
//         const saved = await saveResponse.json();
//         console.log('File metadata saved to database:', saved);
//         if(saved && saved.data.model && saved.data.model.id){
//         extractedid = saved.data.model.id;
//         setAudioId(extractedid);
        
      
//       }
//       else{
//         console.error('Unexpected response structure:', saved);
//       }
//       console.log('Audio ID set to:',extractedid );
     
        
        
//        } catch (error) {
//         console.error('Error saving file to database:', error);
//        }
//       }

      
//     } catch (error) {
//       console.error('Error generating presigned URL:', error);
//     }
//   };

//   const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
//     event.preventDefault();
//     setIsDragging(false);
//     const file = event.dataTransfer.files?.[0] ?? null;
//     handleFile(file);
//   };

//   const togglePlayback = async () => {
//     const audio = audioRef.current;
//     if (!audio || !audioUrl) return;

//     if (audio.paused) {
//       await audio.play();
//       setIsPlaying(true);
//     } else {
//       audio.pause();
//       setIsPlaying(false);
//     }
//   };

//   const handleTimeUpdate = () => {
//     const audio = audioRef.current;
//     if (!audio) return;
//     const remaining = Math.max(0, audio.duration - audio.currentTime);
//     setCurrentTime(remaining);
//   };

//   const displayRemaining = audioDuration ? formatTime(currentTime || 0) : '0:00';
//   const progressPercent = audioRef.current && audioRef.current.duration
//     ? (audioRef.current.currentTime / audioRef.current.duration) * 100
//     : 60;
   

//   const OnMove = async () => {
//      {
//    try{

   
//     console.log('Extracted ID:', audioId);
    
//      const hitreq = await fetch(`http://localhost:5252/api/Audio/start-processing/${audioId}`, {
//       method: 'POST',
    
      
//     });

//     const saved = await hitreq.json();
//     console.log('Message we got:', saved.message);


//    }
//     catch (error) {
//       console.error('Error hitting webhook:',error);

//     }


//     }};

//   return (
//     <div
//       className={`absolute inset-0 transition-all duration-700 ease-in-out ${
//         isActive ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
//       }`}
//     >
//       <audio
//         ref={audioRef}
//         src={audioUrl}
//         onTimeUpdate={handleTimeUpdate}
//         onLoadedMetadata={() => {
//           const audio = audioRef.current;
//           if (!audio) return;
//           setCurrentTime(audio.duration || 0);
//         }}
//         onEnded={() => setIsPlaying(false)}
//       />

//       <div className="mx-auto flex h-full w-full max-w-[1200px] items-center justify-center px-4 pt-6">
//         <div
//           className="relative w-full overflow-hidden rounded-[2rem] border p-6 shadow-[0_30px_80px_rgba(0,0,0,0.28)] md:p-8"
//           style={{
//             borderColor: 'rgba(255,255,255,0.1)',
//             backgroundColor: '#0e1116',
//           }}
//           onDragOver={(event) => {
//             event.preventDefault();
//             setIsDragging(true);
//             setShowh1(false);
//           }}
//           onDragLeave={() => setIsDragging(false)}
//           onDrop={handleDrop}
//         >
//           <div
//             className="absolute inset-0"
//             style={{
//               background: `radial-gradient(circle at center, ${colors.button.primaryText}33, transparent 48%)`,
//             }}
//           />

//           <div className="relative z-10 flex flex-col items-center text-center">
//             <div className="mt-5 flex flex-col items-center justify-center">
//               {showh1 && (
//                 <>
//                   <div
//                     className="mb-5 flex h-20 w-20 items-center justify-center rounded-[1.5rem] border shadow-[0_0_30px_rgba(223,233,69,0.25)]"
//                     style={{
//                       borderColor: `${colors.button.primaryText}80`,
//                       backgroundColor: `${colors.button.primaryText}14`,
//                       color: colors.button.primaryText,
//                     }}
//                   >
//                     <svg
//                       width="34"
//                       height="34"
//                       viewBox="0 0 24 24"
//                       fill="none"
//                       stroke="currentColor"
//                       strokeWidth="1.8"
//                       strokeLinecap="round"
//                       strokeLinejoin="round"
//                       aria-hidden="true"
//                     >
//                       <path d="M15 7l-3-3-3 3" />
//                       <path d="M5 15.5v.5A7 7 0 0 0 19 16v-.5" />
//                     </svg>
//                   </div>

//                   <h2
//                     className="text-[clamp(3rem,4.5vw,4.5rem)] font-black leading-[0.92] tracking-[-0.06em]"
//                     style={{ color: 'rgba(255,255,255,0.7)' }}
//                   >
//                     Drop your voice note
//                   </h2>

//                   <p
//                     className="mt-4 max-w-[450px] text-base leading-relaxed md:text-lg"
//                     style={{ color: 'rgba(255,255,255,0.7)' }}
//                   >
//                     Pulse will detect the language, translate the meaning, and pull out what matters.
//                   </p>
//                 </>
//               )}

//               <div
//                 className={`mt-8 rounded-[2rem] border border-dashed p-4 transition-all duration-300 ${
//                   isDragging ? 'scale-[1.02] border-[#dfe945]' : 'border-white/10'
//                 }`}
//                 style={{
//                   background: isDragging ? 'rgba(223, 233, 69, 0.07)' : 'rgba(255,255,255,0.02)',
//                 }}
//               >
//                 <label
//                   className="inline-flex cursor-pointer items-center gap-3 rounded-full px-26 py-4 text-base font-semibold transition-transform duration-200 hover:-translate-y-0.5"
//                   style={{
//                     backgroundColor: colors.background.primary,
//                     color: colors.text.primary,
//                     boxShadow: `0 18px 38px ${colors.button.shadow}`,
//                   }}
//                 >
//                   <input
//                     ref={inputRef}
//                     type="file"
//                     accept="audio/*"
//                     className="hidden"
//                     onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
//                   />
//                   <span>{selectedFile ? 'Replace audio file' : 'Browse audio files'}</span>
//                   <span aria-hidden="true">→</span>
//                 </label>
//               </div>

//               {selectedFile && (

//                 <>


//                   <div className="relative mt-5 h-[220px] w-full">
//                   <div
//                     className="absolute left-1/2 top-0 bg-red-400 h-[160px] w-full rounded-[2rem] border border-white/10 p-4 shadow-[0_20px_40px_rgba(0,0,0,0.35)]"
//                     style={{
//                       background: 'linear-gradient(180deg, rgba(16,20,25,0.98), rgba(9,12,16,0.98))',
//                       transform: 'translateX(-50%) translateY(-1%)',
//                       zIndex: 3,
//                     }}
//                   >
//                     <div className="flex h-full  flex-col justify-between">
//                       <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-white/60">
//                         <span>Voice note</span>
//                         <span>{displayRemaining}</span>
//                       </div>

//                       <div className="flex items-center gap-3">
//                         <button
//                           type="button"
//                           onClick={togglePlayback}
//                           className="flex h-10 w-10 items-center justify-center rounded-full bg-[#dfe945] text-black"
//                           aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
//                         >
//                           {isPlaying ? (
//                             <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
//                               <rect x="5" y="4" width="5" height="16" rx="1.5" />
//                               <rect x="14" y="4" width="5" height="16" rx="1.5" />
//                             </svg>
//                           ) : (
//                             <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
//                               <path d="M8 5v14l11-7-11-7z" />
//                             </svg>
//                           )}
//                         </button>

//                         <div className="flex-1">
//                           <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-white/15">
//                             <div
//                               className="h-2 rounded-full bg-[#dfe945] transition-all duration-150 ease-linear"
//                               style={{ width: `${Math.min(Math.max(progressPercent, 0), 100)}%` }}
//                             />
//                           </div>
//                           {/* <div className="flex items-center justify-between text-[11px] text-white/60">
//                             <span>{selectedFile.name}</span>
//                             <span>{Math.max(1, Math.round(selectedFile.size / 1024))} KB</span>
//                           </div> */}
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 </div>


//                 <button
//                 type="button"
//                 className=" inline-flex items-center justify-center gap-2 rounded-full border px-7 py-3 text-sm font-semibold  transition-all duration-200 hover:-translate-y-0.5"
//                 style={{
//                   borderColor: `${colors.button.primaryText}60`,
//                   background: `linear-gradient(135deg, ${colors.background.primary}, #dfe945)`,
//                   color: '#0e1116',
//                   boxShadow: `0 18px 38px ${colors.button.shadow}`,
//                 }}
//                 onClick={()=>{OnMove(),onMoveForward()}}
//               >
//                 <span>Shall we move forward?</span>
//                 <span aria-hidden="true">→</span>
//               </button>
                
                
                
                
//                 </>
              



//               )}


              

//               {showh1 && (
//                 <div
//                   className="mt-8 flex items-center gap-3 text-[0.72rem] uppercase tracking-[0.25em]"
//                   style={{ color: 'rgba(255,255,255,0.45)' }}
//                 >
//                   <span>M4A</span>
//                   <span>•</span>
//                   <span>MP3</span>
//                   <span>•</span>
//                   <span>WAV</span>
//                   <span>•</span>
//                   <span>OGG</span>
//                   <span>•</span>
//                   <span>25 MB max</span>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );

// }



import { useRef, useState } from 'react';
import { colors } from '../../theme/colors';
import { z } from 'zod';
import { useApp } from '../../../Context/AppContext.jsx';

type Screen2Props = {
  isActive: boolean;
  onMoveForward: () => void;
};

const audioSchema = z.object({
  fileid: z.string().optional(),
  filename: z.string().min(1, "Filename is required"),
  filetype: z.string().startsWith("audio/", "File must be an audio type"),
  filesize: z.number().max(524288000, "File size must be between 1 Byte ro 500 MB"),
  duration: z.number().min(1, "Duration must be at least 1 second").max(36000, "Duration must be less than or equal to 10 hours"),
});

export default function Screen2({ isActive, onMoveForward }: Screen2Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showh1, setShowh1] = useState(true);
  const [audioDuration, setAudioDuration] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const { setAudioId } = useApp();
  const { audioId } = useApp();

  const formatTime = (value: number) => {
    const safeValue = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    const minutes = Math.floor(safeValue / 60);
    const seconds = safeValue % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  let extractedid: any;

  const handleFile = async (file: File | null) => {
    if (!file) return;

    setSelectedFile(file);
    setShowh1(false);
    setCurrentTime(0);
    setIsUploading(true);

    const nextUrl = URL.createObjectURL(file);
    setAudioUrl(nextUrl);

    const durationInSeconds = await new Promise<number>((resolve) => {
      const audio = new Audio(nextUrl);

      audio.onloadedmetadata = () => {
        const safeDuration = Number.isFinite(audio.duration) ? Math.floor(audio.duration) : 0;
        resolve(safeDuration);
      };

      audio.onerror = () => resolve(0);
    });

    setAudioDuration(formatTime(durationInSeconds));
    console.log('Audio duration (seconds):', durationInSeconds);

    if (inputRef.current) {
      inputRef.current.value = '';
    }

    const metadata = {
      filename: file.name,
      filetype: file.type,
      filesize: file.size,
      duration: durationInSeconds,
    };

    const validationResult = audioSchema.safeParse(metadata);
    if (!validationResult.success) {
      console.error('Validation failed:', validationResult.error.format());
    } else {
      console.log('Validation succeeded:', validationResult.data);
    }

    try {
      const response = await fetch('/api/Audio/generate-presigned-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: file.name,
          file_type: file.type,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const presignedUrl = data.presignedurl;
      const filekey = data.filekey;

      const upload = await fetch(presignedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (upload.ok) {
        console.log('File successfully written to cloud');

        try {
          const saveResponse = await fetch('/api/Audio/save-to-db', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              filename: file.name,
              filetype: file.type,
              filesize: file.size,
              duration: durationInSeconds,
              status: 'PENDING',
              filekey: filekey,
            }),
          });

          console.log('Data', { filename: file.name, filetype: file.type, filesize: file.size, duration: durationInSeconds, status: 'PENDING', filekey: filekey });

          if (!saveResponse.ok) {
            throw new Error(`HTTP error! status: ${saveResponse.status}`);
          }

          const saved = await saveResponse.json();
          console.log('File metadata saved to database:', saved);
          if (saved && saved.data.model && saved.data.model.id) {
            extractedid = saved.data.model.id;
            setAudioId(extractedid);
          } else {
            console.error('Unexpected response structure:', saved);
          }
          console.log('Audio ID set to:', extractedid);
        } catch (error) {
          console.error('Error saving file to database:', error);
        }
      }
    } catch (error) {
      console.error('Error generating presigned URL:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0] ?? null;
    handleFile(file);
  };

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    if (audio.paused) {
      await audio.play();
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const remaining = Math.max(0, audio.duration - audio.currentTime);
    setCurrentTime(remaining);
  };

  const displayRemaining = audioDuration ? formatTime(currentTime || 0) : '0:00';
  const progressPercent = audioRef.current && audioRef.current.duration
    ? (audioRef.current.currentTime / audioRef.current.duration) * 100
    : 0;

  const OnMove = async () => {
    try {
      console.log('Extracted ID:', audioId);

      const hitreq = await fetch(`/api/Audio/start-processing/${audioId}`, {
        method: 'POST',
      });

      const saved = await hitreq.json();
      console.log('Message we got:', saved.message);
    } catch (error) {
      console.error('Error hitting webhook:', error);
    }
  };

  const fileSizeLabel = selectedFile ? `${Math.max(1, Math.round(selectedFile.size / (1024 * 1024) * 10) / 10)} MB` : '';

  return (
    <div
      className={`absolute inset-0 transition-all duration-700 ease-in-out ${
        isActive ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
      }`}
    >
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => {
          const audio = audioRef.current;
          if (!audio) return;
          setCurrentTime(audio.duration || 0);
        }}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="mx-auto flex h-full w-full max-w-[1200px] items-center justify-center px-4 pt-6">
        <div
          className="relative w-full overflow-hidden rounded-[2rem] border p-6 shadow-[0_30px_80px_rgba(0,0,0,0.28)] md:p-8"
          style={{
            borderColor: 'rgba(255,255,255,0.1)',
            backgroundColor: '#0e1116',
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
            setShowh1(false);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at center, ${colors.button.primaryText}33, transparent 48%)`,
            }}
          />

          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="mt-5 flex w-full max-w-[560px] flex-col items-center justify-center">
              {showh1 && (
                <>
                  <div
                    className="mb-5 flex h-20 w-20 items-center justify-center rounded-[1.5rem] border shadow-[0_0_30px_rgba(223,233,69,0.25)]"
                    style={{
                      borderColor: `${colors.button.primaryText}80`,
                      backgroundColor: `${colors.button.primaryText}14`,
                      color: colors.button.primaryText,
                    }}
                  >
                    <svg
                      width="34"
                      height="34"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M15 7l-3-3-3 3" />
                      <path d="M5 15.5v.5A7 7 0 0 0 19 16v-.5" />
                    </svg>
                  </div>

                  <h2
                    className="text-[clamp(3rem,4.5vw,4.5rem)] font-black leading-[0.92] tracking-[-0.06em]"
                    style={{ color: 'rgba(255,255,255,0.7)' }}
                  >
                    Drop your voice note
                  </h2>

                  <p
                    className="mt-4 max-w-[450px] text-base leading-relaxed md:text-lg"
                    style={{ color: 'rgba(255,255,255,0.7)' }}
                  >
                    Pulse will detect the language, translate the meaning, and pull out what matters.
                  </p>
                </>
              )}

              <div
                className={`mt-8 w-full rounded-[2rem] border border-dashed p-4 transition-all duration-300 ${
                  isDragging ? 'scale-[1.02] border-[#dfe945]' : 'border-white/10'
                }`}
                style={{
                  background: isDragging ? 'rgba(223, 233, 69, 0.07)' : 'rgba(255,255,255,0.02)',
                }}
              >
                <label
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-3 rounded-full px-8 py-4 text-base font-semibold transition-transform duration-200 hover:-translate-y-0.5"
                  style={{
                    backgroundColor: colors.background.primary,
                    color: colors.text.primary,
                    boxShadow: `0 18px 38px ${colors.button.shadow}`,
                  }}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
                  />
                  <span>{selectedFile ? 'Replace audio file' : 'Browse audio files'}</span>
                  <span aria-hidden="true">→</span>
                </label>
              </div>

              {selectedFile && (
                <>
                  <div
                    className="mt-6 w-full rounded-[1.5rem] border p-5 shadow-[0_20px_40px_rgba(0,0,0,0.35)]"
                    style={{
                      borderColor: 'rgba(255,255,255,0.08)',
                      background: 'linear-gradient(180deg, rgba(16,20,25,0.98), rgba(9,12,16,0.98))',
                    }}
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-left">
                        <div
                          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
                          style={{ backgroundColor: `${colors.button.primaryText}18`, color: colors.button.primaryText }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 18V5l12-2v13" />
                            <circle cx="6" cy="18" r="3" />
                            <circle cx="18" cy="16" r="3" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <div className="max-w-[220px] truncate text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                            {selectedFile.name}
                          </div>
                          <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                            {fileSizeLabel} · {audioDuration || '0:00'}
                          </div>
                        </div>
                      </div>
                      <span
                        className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em]"
                        style={{
                          backgroundColor: isUploading ? `${colors.button.primaryText}18` : 'rgba(76,175,80,0.15)',
                          color: isUploading ? colors.button.primaryText : '#4caf50',
                        }}
                      >
                        {isUploading ? 'Uploading' : 'Ready'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={togglePlayback}
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#dfe945] text-black"
                        aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
                      >
                        {isPlaying ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <rect x="5" y="4" width="5" height="16" rx="1.5" />
                            <rect x="14" y="4" width="5" height="16" rx="1.5" />
                          </svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M8 5v14l11-7-11-7z" />
                          </svg>
                        )}
                      </button>

                      <div className="flex-1">
                        <div className="mb-1.5 h-2 w-full overflow-hidden rounded-full bg-white/15">
                          <div
                            className="h-2 rounded-full bg-[#dfe945] transition-all duration-150 ease-linear"
                            style={{ width: `${Math.min(Math.max(progressPercent, 0), 100)}%` }}
                          />
                        </div>
                        <div className="text-right text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          {displayRemaining} remaining
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isUploading}
                    className="mt-5 inline-flex items-center justify-center gap-2 rounded-full border px-7 py-3 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                    style={{
                      borderColor: `${colors.button.primaryText}60`,
                      background: `linear-gradient(135deg, ${colors.background.primary}, #dfe945)`,
                      color: '#0e1116',
                      boxShadow: `0 18px 38px ${colors.button.shadow}`,
                    }}
                    onClick={() => {
                      OnMove();
                      onMoveForward();
                    }}
                  >
                    <span>{isUploading ? 'Uploading...' : 'Shall we move forward?'}</span>
                    {!isUploading && <span aria-hidden="true">→</span>}
                  </button>
                </>
              )}

              {showh1 && (
                <div
                  className="mt-8 flex items-center gap-3 text-[0.72rem] uppercase tracking-[0.25em]"
                  style={{ color: 'rgba(255,255,255,0.45)' }}
                >
                  <span>M4A</span>
                  <span>•</span>
                  <span>MP3</span>
                  <span>•</span>
                  <span>WAV</span>
                  <span>•</span>
                  <span>OGG</span>
                  <span>•</span>
                  <span>25 MB max</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}