"use client"

import { useState, useRef, useEffect, Fragment } from "react"
import { ChevronDownIcon } from "@heroicons/react/20/solid"
import { Transition } from "@headlessui/react"

interface Option {
  id: string | number
  [key: string]: any
}

interface CustomDropdownProps<T extends Option> {
  options: T[]
  value: T | null
  onChange: (value: T) => void
  placeholder?: string
  displayKey?: keyof T
  disabled?: boolean
}

function classNames(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}

export default function CustomDropdown<T extends Option>({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  displayKey = "nombre",
  disabled = false,
}: CustomDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleSelect = (option: T) => {
    onChange(option)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
      >
        <span className="block truncate">{value ? value[displayKey] : placeholder}</span>
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <span className="material-symbols-outlined text-gray-400">arrow_drop_down</span>
        </span>
      </button>

      <Transition
        show={isOpen}
        as={Fragment}
        leave="transition ease-in duration-100"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div className="absolute z-10 mt-1 w-25 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none max-h-[200px] overflow-auto">
          <ul className="py-1 text-base sm:text-sm">
            {options.map((option) => (
              <li
                key={option.id}
                onClick={() => handleSelect(option)}
                className={classNames(
                  "relative cursor-default select-none py-2 px-4",
                  "text-gray-900 hover:bg-indigo-600 hover:text-white"
                )}
              >
                <span className={classNames("block truncate", value?.id === option.id ? "font-semibold" : "font-normal")}>
                  {option[displayKey]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Transition>
    </div>
  )
}
