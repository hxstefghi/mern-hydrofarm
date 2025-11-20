import React, { useState } from "react";
import api from '../lib/api';


const CMD_API = '/api/commands/send';


const ControlPanel = () => {
    const [message, setMessage] = useState("");


    const sendCommand = async (cmd) => {
        try {
            await api.post(CMD_API, { command: cmd });
            setMessage(`Command '${cmd}' sent to Arduino`);
        } catch (error) {
            console.error("Failed to send command:", error);
            setMessage(`Failed to send command: ${error.message || "unknown error"}`);
        }
    };


    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-bold mb-4">Control Panel</h2>


            <div className="grid grid-cols-1 gap-4">
                <button
                    onClick={() => sendCommand("PUMP_ON")}
                    className="bg-green-500 text-white p-3 rounded-lg hover:bg-green-600"
                >
                    Pump ON
                </button>


                <button
                    onClick={() => sendCommand("PUMP_OFF")}
                    className="bg-red-500 text-white p-3 rounded-lg hover:bg-red-600"
                >
                    Pump OFF
                </button>


                <button
                    onClick={() => sendCommand("FAN_ON")}
                    className="bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600"
                >
                    Fan ON
                </button>


                <button
                    onClick={() => sendCommand("FAN_OFF")}
                    className="bg-gray-700 text-white p-3 rounded-lg hover:bg-gray-800"
                >
                    Fan OFF
                </button>
            </div>


            {message && <p className="mt-4 text-sm text-blue-600">{message}</p>}
        </div>
    );
};


export default ControlPanel;