import Image from "next/image";

export default function Home() {
  return (
      <div className="flex flex-col items-center  min-h-screen py-2 gap-4">
        <h2>Welcome to the Home Page</h2>
        <div className="p-4 bg-blue-400">
          DPI (Deep Packet Inspection) ML system 
        </div>
      </div>
  );
}
